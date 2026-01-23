use rcgen::{
    BasicConstraints, CertificateParams, DistinguishedName, DnType, ExtendedKeyUsagePurpose, IsCa,
    KeyPair, KeyUsagePurpose, SanType,
};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;

#[derive(Clone)]
pub struct CaManager {
    ca_cert_pem: String,
    ca_key_pem: String,
    cert_dir: PathBuf,
}

impl CaManager {
    pub fn new(app_data_dir: PathBuf) -> Result<Self, String> {
        let cert_dir = app_data_dir.join("certificates");
        fs::create_dir_all(&cert_dir).map_err(|e| format!("Failed to create cert dir: {}", e))?;

        let ca_cert_path = cert_dir.join("ca.crt");
        let ca_key_path = cert_dir.join("ca.key");

        if ca_cert_path.exists() && ca_key_path.exists() {
            let ca_cert_pem = fs::read_to_string(&ca_cert_path)
                .map_err(|e| format!("Failed to read CA cert: {}", e))?;
            let ca_key_pem = fs::read_to_string(&ca_key_path)
                .map_err(|e| format!("Failed to read CA key: {}", e))?;

            return Ok(Self {
                ca_cert_pem,
                ca_key_pem,
                cert_dir,
            });
        }

        let (ca_cert_pem, ca_key_pem) = Self::generate_ca_cert()?;

        fs::write(&ca_cert_path, &ca_cert_pem)
            .map_err(|e| format!("Failed to write CA cert: {}", e))?;
        fs::write(&ca_key_path, &ca_key_pem)
            .map_err(|e| format!("Failed to write CA key: {}", e))?;

        Ok(Self {
            ca_cert_pem,
            ca_key_pem,
            cert_dir,
        })
    }

    fn generate_ca_cert() -> Result<(String, String), String> {
        let mut params = CertificateParams::default();
        params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
        params.key_usages = vec![KeyUsagePurpose::KeyCertSign, KeyUsagePurpose::CrlSign];

        let mut dn = DistinguishedName::new();
        dn.push(DnType::CommonName, "Cavin Tools Local CA");
        dn.push(DnType::OrganizationName, "Cavin Tools");
        dn.push(DnType::CountryName, "CN");
        params.distinguished_name = dn;

        params.not_before = time::OffsetDateTime::now_utc();
        params.not_after = params.not_before + time::Duration::days(3650);

        let key_pair = KeyPair::generate().map_err(|e| format!("Failed to generate key: {}", e))?;
        let cert = params
            .self_signed(&key_pair)
            .map_err(|e| format!("Failed to self-sign CA: {}", e))?;

        Ok((cert.pem(), key_pair.serialize_pem()))
    }

    fn get_ca_cert_and_key(&self) -> Result<(rcgen::Certificate, KeyPair), String> {
        let ca_key =
            KeyPair::from_pem(&self.ca_key_pem).map_err(|e| format!("Invalid CA key: {}", e))?;

        let mut ca_params = CertificateParams::default();
        ca_params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
        ca_params.key_usages = vec![KeyUsagePurpose::KeyCertSign, KeyUsagePurpose::CrlSign];

        let mut dn = DistinguishedName::new();
        dn.push(DnType::CommonName, "Cavin Tools Local CA");
        dn.push(DnType::OrganizationName, "Cavin Tools");
        dn.push(DnType::CountryName, "CN");
        ca_params.distinguished_name = dn;

        ca_params.not_before = time::OffsetDateTime::now_utc() - time::Duration::days(1);
        ca_params.not_after = time::OffsetDateTime::now_utc() + time::Duration::days(3650);

        let ca_cert = ca_params
            .self_signed(&ca_key)
            .map_err(|e| format!("Failed to recreate CA: {}", e))?;

        Ok((ca_cert, ca_key))
    }

    pub fn sign_cert_for_domain(&self, domain: &str) -> Result<(String, String), String> {
        let (ca_cert, ca_key) = self.get_ca_cert_and_key()?;

        let mut params = CertificateParams::new(vec![domain.to_string()])
            .map_err(|e| format!("Invalid domain: {}", e))?;

        let mut dn = DistinguishedName::new();
        dn.push(DnType::CommonName, domain);
        params.distinguished_name = dn;

        params.subject_alt_names = vec![SanType::DnsName(domain.try_into().unwrap())];

        params.key_usages = vec![
            KeyUsagePurpose::DigitalSignature,
            KeyUsagePurpose::KeyEncipherment,
        ];
        params.extended_key_usages = vec![ExtendedKeyUsagePurpose::ServerAuth];

        params.not_before = time::OffsetDateTime::now_utc();
        params.not_after = params.not_before + time::Duration::days(365);

        let key_pair =
            KeyPair::generate().map_err(|e| format!("Failed to generate domain key: {}", e))?;
        let cert = params
            .signed_by(&key_pair, &ca_cert, &ca_key)
            .map_err(|e| format!("Failed to sign domain cert: {}", e))?;

        Ok((cert.pem(), key_pair.serialize_pem()))
    }

    pub fn get_ca_cert_path(&self) -> PathBuf {
        self.cert_dir.join("ca.crt")
    }

    pub fn get_ca_cert_pem(&self) -> String {
        self.ca_cert_pem.clone()
    }

    pub fn clone_arc(&self) -> Arc<Self> {
        Arc::new(self.clone())
    }
}
