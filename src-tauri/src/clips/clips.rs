use std::{
    io::{self, Write},
    time::Instant,
};

use windows_capture::encoder::VideoEncoder;

struct Capture {
    encoder: Option<VideoEncoder>,
    start: Instant,
}