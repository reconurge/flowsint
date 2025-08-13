from pydantic import BaseModel, Field
from typing import Optional, List


class SSLCertificate(BaseModel):
    """Represents an SSL/TLS certificate with validation and security details."""

    subject: str = Field(
        ..., description="Certificate subject (domain name)", title="Subject"
    )
    issuer: Optional[str] = Field(
        None,
        description="Certificate authority that issued the certificate",
        title="Issuer",
    )
    serial_number: Optional[str] = Field(
        None, description="Certificate serial number", title="Serial Number"
    )
    valid_from: Optional[str] = Field(
        None, description="Certificate validity start date", title="Valid From"
    )
    valid_until: Optional[str] = Field(
        None, description="Certificate validity end date", title="Valid Until"
    )
    signature_algorithm: Optional[str] = Field(
        None, description="Signature algorithm used", title="Signature Algorithm"
    )
    key_size: Optional[int] = Field(
        None, description="Key size in bits", title="Key Size"
    )
    key_type: Optional[str] = Field(
        None, description="Type of key (RSA, ECDSA, etc.)", title="Key Type"
    )
    san_domains: Optional[List[str]] = Field(
        None, description="Subject Alternative Names", title="SAN Domains"
    )
    is_valid: Optional[bool] = Field(
        None, description="Whether certificate is currently valid", title="Is Valid"
    )
    is_expired: Optional[bool] = Field(
        None, description="Whether certificate has expired", title="Is Expired"
    )
    is_self_signed: Optional[bool] = Field(
        None, description="Whether certificate is self-signed", title="Is Self Signed"
    )
    is_wildcard: Optional[bool] = Field(
        None,
        description="Whether certificate is a wildcard certificate",
        title="Is Wildcard",
    )
    ocsp_status: Optional[str] = Field(
        None, description="OCSP revocation status", title="OCSP Status"
    )
    crl_status: Optional[str] = Field(
        None, description="Certificate Revocation List status", title="CRL Status"
    )
    first_seen: Optional[str] = Field(
        None, description="First time certificate was observed", title="First Seen"
    )
    last_seen: Optional[str] = Field(
        None, description="Last time certificate was observed", title="Last Seen"
    )
    source: Optional[str] = Field(
        None, description="Source of certificate information", title="Source"
    )
    fingerprint_sha1: Optional[str] = Field(
        None, description="SHA1 fingerprint", title="SHA1 Fingerprint"
    )
    fingerprint_sha256: Optional[str] = Field(
        None, description="SHA256 fingerprint", title="SHA256 Fingerprint"
    )
