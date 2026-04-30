use std::collections::HashMap;
use std::mem;
use std::sync::atomic::{AtomicU32, AtomicUsize, Ordering};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::Arc;
use std::time::{Duration, Instant};

use imgui::Context;
use once_cell::sync::{Lazy, OnceCell};
use parking_lot::Mutex;
use tracing::error;
use windows::core::{Error, Result, HRESULT};
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    CallWindowProcW, DefWindowProcW, SetWindowLongPtrW, GWLP_WNDPROC,
};

use crate::renderer::input::{imgui_wnd_proc_impl, WndProcType};
use crate::renderer::RenderEngine;
use crate::{util, ImguiRenderLoop, MessageFilter};

type RenderLoop = Box<dyn ImguiRenderLoop + Send + Sync>;

static PIPELINE_STATES: Lazy<Mutex<HashMap<isize, Arc<PipelineSharedState>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

// Cached original WndProc pointer for the game's render window.
// Written (Relaxed) on the first successful pipeline_wnd_proc non-mouse-message call.
// Allows WM_MOUSEMOVE and WM_INPUT to bypass parking_lot::Mutex + HashMap + Arc::clone,
// reducing per-message overhead at 4000 Hz from ~5 atomic ops to 1 atomic load.
// Assumes a single render window HWND (true for all known games).
static FAST_WNDPROC: AtomicUsize = AtomicUsize::new(0);

#[derive(Debug)]
pub(crate) struct PipelineMessage(
    pub(crate) HWND,
    pub(crate) u32,
    pub(crate) WPARAM,
    pub(crate) LPARAM,
);

pub(crate) struct PipelineSharedState {
    pub(crate) message_filter: AtomicU32,
    pub(crate) wnd_proc: WndProcType,
    pub(crate) tx: Sender<PipelineMessage>,
}

pub(crate) struct Pipeline<T: RenderEngine> {
    hwnd: HWND,
    ctx: Context,
    engine: T,
    render_loop: RenderLoop,
    rx: Receiver<PipelineMessage>,
    shared_state: Arc<PipelineSharedState>,
    queue_buffer: OnceCell<Vec<PipelineMessage>>,
    start_of_first_frame: OnceCell<Instant>,
}

impl<T: RenderEngine> Pipeline<T> {
    pub(crate) fn new(
        hwnd: HWND,
        mut ctx: Context,
        mut engine: T,
        mut render_loop: RenderLoop,
    ) -> std::result::Result<Self, (Error, RenderLoop)> {
        let (width, height) = util::win_size(hwnd);

        ctx.io_mut().display_size = [width as f32, height as f32];

        render_loop.initialize(&mut ctx, &mut engine);

        if let Err(e) = engine.setup_fonts(&mut ctx) {
            return Err((e, render_loop));
        }

        let wnd_proc = unsafe {
            #[cfg(target_arch = "x86")]
            type SwlpRet = i32;
            #[cfg(target_arch = "x86_64")]
            type SwlpRet = isize;

            mem::transmute::<SwlpRet, WndProcType>(SetWindowLongPtrW(
                hwnd,
                GWLP_WNDPROC,
                pipeline_wnd_proc as *const () as _,
            ))
        };

        let (tx, rx) = mpsc::channel();
        let shared_state = Arc::new(PipelineSharedState {
            message_filter: AtomicU32::new(MessageFilter::empty().bits()),
            wnd_proc,
            tx,
        });

        PIPELINE_STATES.lock().insert(hwnd.0, Arc::clone(&shared_state));

        let queue_buffer = OnceCell::from(Vec::new());

        Ok(Self {
            hwnd,
            ctx,
            engine,
            render_loop,
            rx,
            shared_state: Arc::clone(&shared_state),
            queue_buffer,
            start_of_first_frame: OnceCell::new(),
        })
    }

    pub(crate) fn prepare_render(&mut self) -> Result<()> {
        let mut queue_buffer = self.queue_buffer.take().unwrap();
        queue_buffer.clear();
        queue_buffer.extend(self.rx.try_iter());
        queue_buffer.drain(..).for_each(|PipelineMessage(hwnd, umsg, wparam, lparam)| {
            imgui_wnd_proc_impl(hwnd, umsg, wparam, lparam, self);
        });
        self.queue_buffer.set(queue_buffer).expect("OnceCell should be empty");

        // message_filter() always returns empty() for our overlay (no imgui UI to protect).
        // Store Relaxed — the WndProc reads with Relaxed, and on x86 TSO stores
        // are always visible to subsequent loads without a fence.
        let message_filter = self.render_loop.message_filter(self.ctx.io());
        self.shared_state.message_filter.store(message_filter.bits(), Ordering::Relaxed);

        let io = self.ctx.io_mut();

        io.nav_active = true;
        io.nav_visible = true;

        self.render_loop.before_render(&mut self.ctx, &mut self.engine);

        Ok(())
    }

    pub(crate) fn render(&mut self, render_target: T::RenderTarget) -> Result<()> {
        let delta_time = Instant::now()
            .checked_duration_since(*self.start_of_first_frame.get_or_init(Instant::now))
            .unwrap_or(Duration::ZERO)
            .checked_sub(Duration::from_secs_f64(self.ctx.time()))
            .unwrap_or(Duration::ZERO);

        self.ctx.io_mut().update_delta_time(delta_time);

        let [w, h] = self.ctx.io().display_size;
        let [fsw, fsh] = self.ctx.io().display_framebuffer_scale;

        if (w * fsw) <= 0.0 || (h * fsh) <= 0.0 {
            error!("Insufficient display size: {w}x{h}");
            return Err(Error::from_hresult(HRESULT(-1)));
        }

        let ui = self.ctx.frame();
        self.render_loop.render(ui);
        let draw_data = self.ctx.render();

        self.engine.render(draw_data, render_target)?;

        Ok(())
    }

    pub(crate) fn context(&mut self) -> &mut Context {
        &mut self.ctx
    }

    pub(crate) fn render_loop(&mut self) -> &mut RenderLoop {
        &mut self.render_loop
    }

    pub(crate) fn resize(&mut self, width: u32, height: u32) {
        self.ctx.io_mut().display_size = [width as f32, height as f32];
    }

    pub(crate) fn cleanup(&mut self) {
        unsafe {
            SetWindowLongPtrW(self.hwnd, GWLP_WNDPROC, self.shared_state.wnd_proc as usize as _)
        };
    }

    pub(crate) fn take(mut self) -> RenderLoop {
        self.cleanup();
        self.render_loop
    }
}

unsafe extern "system" fn pipeline_wnd_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    use windows::Win32::UI::WindowsAndMessaging::{
        WM_INPUT, WM_MOUSEMOVE, WM_NCHITTEST, WM_SETCURSOR, WM_NCMOUSEMOVE, WM_SIZE,
    };

    // Fast path: forward directly to the game's original WndProc without any
    // hudhook overhead (no Mutex, no HashMap, no Arc, no channel send).
    //
    // The ONLY message imgui actively uses for our overlay is WM_SIZE (to keep
    // display_size in sync with window resize). Everything else is irrelevant:
    //   - Mouse movement cluster (WM_INPUT, WM_MOUSEMOVE, WM_NCHITTEST,
    //     WM_SETCURSOR, WM_NCMOUSEMOVE): NO_MOUSE flag makes imgui ignore all.
    //   - Keyboard (WM_KEYDOWN etc.): we have no imgui keyboard-driven UI.
    //   - Mouse buttons (WM_LBUTTONDOWN etc.): NO_MOUSE.
    //   - WM_CHAR: no imgui text input fields.
    //   - WM_ACTIVATE, WM_SETFOCUS etc.: no imgui focus handling needed.
    //
    // Result: at 4000 Hz, 20 000+ WndProc calls/sec go through a single
    // Relaxed atomic load instead of parking_lot::Mutex + HashMap + Arc.
    let fast_ptr = FAST_WNDPROC.load(Ordering::Relaxed);
    if fast_ptr != 0 && msg != WM_SIZE {
        let wnd_proc: WndProcType = mem::transmute(fast_ptr);
        return CallWindowProcW(Some(wnd_proc), hwnd, msg, wparam, lparam);
    }

    let shared_state = {
        let Some(shared_state_guard) = PIPELINE_STATES.try_lock() else {
            error!("Could not lock shared state in window procedure");
            return DefWindowProcW(hwnd, msg, wparam, lparam);
        };

        let Some(shared_state) = shared_state_guard.get(&hwnd.0) else {
            error!("Could not get shared state for handle {hwnd:?}");
            return DefWindowProcW(hwnd, msg, wparam, lparam);
        };

        // Cache the game's original WndProc pointer for all future fast-path calls.
        // Written Relaxed: the pointer is effectively const after Pipeline::new,
        // and x86 TSO guarantees subsequent Relaxed loads on any thread see it.
        FAST_WNDPROC.store(shared_state.wnd_proc as usize, Ordering::Relaxed);

        Arc::clone(shared_state)
    };

    // Only queue WM_SIZE — the one message imgui must process (display_size update).
    // All other messages falling through here are pre-FAST_WNDPROC-cache startup
    // messages; skip queuing them so the channel stays empty at steady state.
    if msg == WM_SIZE {
        if let Err(e) = shared_state.tx.send(PipelineMessage(hwnd, msg, wparam, lparam)) {
            error!("Could not send window message through pipeline: {e:?}");
        }
    }

    // CONCURRENCY: Relaxed is sufficient on x86 TSO — stores by the render
    // thread are always visible to subsequent loads on any other thread.
    let message_filter =
        MessageFilter::from_bits_retain(shared_state.message_filter.load(Ordering::Relaxed));

    if message_filter.is_blocking(msg) {
        LRESULT(1)
    } else {
        CallWindowProcW(Some(shared_state.wnd_proc), hwnd, msg, wparam, lparam)
    }
}
