#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UserData {
    pub id: u32,
    pub name: String,
    pub status: Status,

    pub friends: Vec<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Status {
    Offline = 0,
    Online = 1,
    Idle = 2,
    DoNotDisturb = 3,
    Invisible = 4,
}
