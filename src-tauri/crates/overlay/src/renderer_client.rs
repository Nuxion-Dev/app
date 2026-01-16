use std::ffi::c_void;
use std::ptr;
use std::time::Duration;
use windows::core::PCWSTR;
use windows::Win32::Foundation::{CloseHandle, HANDLE, INVALID_HANDLE_VALUE};
use windows::Win32::System::Memory::{
    OpenFileMappingW, MapViewOfFile, UnmapViewOfFile, FILE_MAP_READ, MEMORY_MAPPED_VIEW_ADDRESS
};
use windows::Win32::System::Pipes::{WaitNamedPipeW, PIPE_READMODE_MESSAGE};
use windows::Win32::Storage::FileSystem::{
    CreateFileW, OPEN_EXISTING, WriteFile, FILE_SHARE_NONE, FILE_ATTRIBUTE_NORMAL
};
use log::{info, error, warn};
use serde_json::json;

const SHM_NAME_PREFIX: &str = "Local\\NuxionOverlayBuffer_";
const PIPE_NAME_PREFIX: &str = r"\\.\pipe\NuxionOverlayIPC_";
// Header size: 32 bytes (Width, Height, Dirty, Heartbeat...)
const HEADER_SIZE: usize = 32;

// GENERIC_READ = 0x80000000, GENERIC_WRITE = 0x40000000
const GENERIC_READ: u32 = 0x80000000;
const GENERIC_WRITE: u32 = 0x40000000;

pub struct SharedMemoryView {
    handle: HANDLE,
    map_view: MEMORY_MAPPED_VIEW_ADDRESS,
    size: usize,
}

unsafe impl Send for SharedMemoryView {}
unsafe impl Sync for SharedMemoryView {}

impl SharedMemoryView {
    pub fn open(name: &str, size: usize) -> Option<Self> {
        let wide_name: Vec<u16> = name.encode_utf16().chain(std::iter::once(0)).collect();
        unsafe {
            // FILE_MAP_READ is a FILE_MAP enum wrapper in recent windows-rs. Use .0 for u32.
            let handle = OpenFileMappingW(
                FILE_MAP_READ.0, 
                false,
                PCWSTR(wide_name.as_ptr())
            ).ok()?;

            if handle.is_invalid() {
                return None;
            }

            // MapViewOfFile returns MEMORY_MAPPED_VIEW_ADDRESS
            let map_view = MapViewOfFile(handle, FILE_MAP_READ, 0, 0, size);
            
            // Check Value field (capital V in newer windows-rs)
            if map_view.Value.is_null() {
                let _ = CloseHandle(handle);
                return None;
            }

            Some(Self {
                handle,
                map_view,
                size,
            })
        }
    }

    pub fn read_metadata(&self) -> (u32, u32, bool, u32) {
        unsafe {
            let ptr = self.map_view.Value as *const u32;
            let width = *ptr.offset(0);
            let height = *ptr.offset(1);
            let dirty = *ptr.offset(2) != 0;
            let frame = *ptr.offset(3);
            (width, height, dirty, frame)
        }
    }

    pub fn read_pixels(&self, buffer: &mut Vec<u8>, width: u32, height: u32) {
        let len = (width * height * 4) as usize;
        if buffer.len() != len {
            buffer.resize(len, 0);
        }
        unsafe {
            // Pixels start at offset 32
            // map_view.Value is *mut c_void
            if 32 + len <= self.size {
                ptr::copy_nonoverlapping((self.map_view.Value as *const u8).add(32), buffer.as_mut_ptr(), len);
            }
        }
    }
}

impl Drop for SharedMemoryView {
    fn drop(&mut self) {
        unsafe {
            if !self.map_view.Value.is_null() {
                let _ = UnmapViewOfFile(self.map_view);
            }
            if !self.handle.is_invalid() {
                let _ = CloseHandle(self.handle);
            }
        }
    }
}

pub struct RendererClient {
    process: Option<std::process::Child>,
    shm: Option<SharedMemoryView>,
    pub pipe: HANDLE,
    pub width: u32,
    pub height: u32,
    pub last_frame_id: u32,
    pub pixel_buffer: Vec<u8>,
}

unsafe impl Send for RendererClient {}
unsafe impl Sync for RendererClient {}

impl RendererClient {
    pub fn new(dll_dir: Option<String>, width: u32, height: u32, pid: u32, instance_id: &str) -> Self {
        info!("Creating RendererClient for PID: {}, Instance: {}", pid, instance_id);
        
        let exe_path = if let Some(dir) = dll_dir {
            std::path::PathBuf::from(dir).join("overlay_renderer.exe")
        } else {
            std::path::PathBuf::from("overlay_renderer.exe")
        };

        info!("Spawning Renderer: {:?} for {}", exe_path, instance_id);

        let mut command = std::process::Command::new(&exe_path);
        command.arg(format!("{}", pid));
        command.arg(format!("{}", width));
        command.arg(format!("{}", height));
        command.arg(instance_id.to_string());
        
        // Ensure CWD is the directory of the exe so it finds DLLs/assets
        if let Some(cwd) = exe_path.parent() {
            command.current_dir(cwd);
            info!("Setting CWD to: {:?}", cwd);
        }

        // Redirect stdout/stderr to a log file
        let log_path = std::env::temp_dir().join(format!("nuxion_renderer_{}_{}.log", pid, instance_id));
        if let Ok(file) = std::fs::File::create(&log_path) {
            info!("Redirecting renderer output to: {:?}", log_path);
            if let Ok(file_err) = file.try_clone() {
                command.stdout(std::process::Stdio::from(file));
                command.stderr(std::process::Stdio::from(file_err));
            } else {
                 command.stdout(std::process::Stdio::from(file));
            }
        }

        let process = command.spawn()
            .map_err(|e| error!("Failed to spawn renderer: {:?}", e))
            .ok();

        // Wait a bit for SHM and Pipe to be ready
        std::thread::sleep(Duration::from_millis(500));

        let suffix = format!("{}_{}", pid, instance_id);
        let shm_name = format!("{}{}", SHM_NAME_PREFIX, suffix);
        let pipe_name = format!("{}{}", PIPE_NAME_PREFIX, suffix);

        let shm_size = 32 + (width * height * 4) as usize;
        let mut shm = SharedMemoryView::open(&shm_name, shm_size);
        
        // Retry loop for SHM
        if shm.is_none() {
             for i in 0..10 {
                 std::thread::sleep(Duration::from_millis(500));
                 shm = SharedMemoryView::open(&shm_name, shm_size);
                 if shm.is_some() { break; }
                 warn!("Waiting for Shared Memory ({}) ... {}", shm_name, i);
             }
        }

        if shm.is_some() {
            info!("Connected to Shared Memory: {}", shm_name);
        } else {
            error!("Failed to connect to Shared Memory: {}", shm_name);
        }

        // Connect Pipe
        let mut pipe_handle = INVALID_HANDLE_VALUE;
        unsafe {
            let pipe_name_wide: Vec<u16> = pipe_name.encode_utf16().chain(std::iter::once(0)).collect();
            // Wait
            if WaitNamedPipeW(PCWSTR(pipe_name_wide.as_ptr()), 5000).as_bool() {
                 let h = CreateFileW(
                     PCWSTR(pipe_name_wide.as_ptr()),
                     GENERIC_READ | GENERIC_WRITE,
                     FILE_SHARE_NONE,
                     None,
                     OPEN_EXISTING,
                     FILE_ATTRIBUTE_NORMAL,
                     None
                 );
                 if let Ok(handle) = h {
                     pipe_handle = handle;
                     info!("Connected to IPC Pipe: {}", pipe_name);
                 }
            }
        }

        Self {
            process,
            shm,
            pipe: pipe_handle,
            width,
            height,
            last_frame_id: 0,
            pixel_buffer: vec![0u8; (width * height * 4) as usize],
        }
    }


    pub fn check_update(&mut self) -> bool {
        if let Some(shm) = &self.shm {
            let (w, h, _, frame) = shm.read_metadata();
            
            if w != 0 && h != 0 && (w != self.width || h != self.height) {
                // Buffer resize needed
                self.width = w;
                self.height = h;
            }

            if frame != self.last_frame_id {
                self.last_frame_id = frame;
                shm.read_pixels(&mut self.pixel_buffer, self.width, self.height);
                return true;
            }
        }
        false
    }

    pub fn send_command(&mut self, cmd_json: String) {
        if self.pipe == INVALID_HANDLE_VALUE { return; }
        unsafe {
            let bytes = cmd_json.as_bytes();
            let mut written = 0;
            let _ = WriteFile(self.pipe, Some(bytes), Some(&mut written), None);
        }
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        let cmd = json!({
            "type": "resize",
            "w": width,
            "h": height
        }).to_string();
        self.send_command(cmd);
        // Re-open SHM? Usually SHM is fixed size or needs re-mapping. 
        // For now we assume max size or that renderer handles one size.
    }

    pub fn load_html(&mut self, html: &str) {
        let cmd = json!({
            "type": "html",
            "content": html
        }).to_string();
        self.send_command(cmd);
    }

    pub fn execute_script(&mut self, code: &str) {
        let cmd = json!({
            "type": "script",
            "code": code
        }).to_string();
        self.send_command(cmd);
    }
}

impl Drop for RendererClient {
    fn drop(&mut self) {
        unsafe {
            if self.pipe != INVALID_HANDLE_VALUE {
                let _ = CloseHandle(self.pipe);
            }
        }
        if let Some(mut p) = self.process.take() {
            let _ = p.kill();
        }
    }
}
