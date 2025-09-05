use hmac::{Hmac, Mac};
use jwt::{AlgorithmType, Header, SignWithKey, Token, VerifyWithKey};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::sync::{Arc, Mutex};

static JWT_SECRET: &str = dotenv!("WEBSOCKET_TOKEN");
lazy_static! {
    static ref JWT_KEY: Arc<Mutex<Option<Hmac<Sha256>>>> = Arc::new(Mutex::new(None));
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwtClaims {
    pub user_id: u32,
    pub username: String,
    pub exp: u64,
}

impl JwtClaims {
    pub fn new(user_id: u32, username: String) -> Self {
        if JWT_KEY.lock().unwrap().is_none() {
            let key = Hmac::<Sha256>::new_from_slice(JWT_SECRET.as_bytes()).unwrap();
            *JWT_KEY.lock().unwrap() = Some(key);
        }

        let exp = (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as u64;
        Self {
            user_id,
            username,
            exp,
        }
    }

    pub fn encode(&self) -> Result<String, crate::Error> {
        let header = Header {
            algorithm: AlgorithmType::Hs256,
            ..Default::default()
        };
        let key = JWT_KEY.lock().unwrap().as_ref().unwrap().clone();
        let token = Token::new(header, self.clone())
            .sign_with_key(&key)
            .expect("Failed to sign JWT");
        Ok(token.as_str().to_string())
    }
}

pub fn decode(token_str: &str) -> Result<JwtClaims, crate::Error> {
    let key = JWT_KEY.lock().unwrap().as_ref().unwrap().clone();
    let token: Token<Header, JwtClaims, _> = token_str
        .verify_with_key(&key)
        .map_err(|e| crate::Error::Text(format!("Failed to verify JWT: {}", e)))?;
    Ok(token.claims().clone())
}
