from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from .address import Location


class Individual(BaseModel):
    """Represents an individual person with comprehensive personal information."""

    # Basic Information
    first_name: str = Field(
        ..., description="First name of the individual", title="First Name"
    )
    last_name: str = Field(
        ..., description="Last name of the individual", title="Last Name"
    )
    full_name: str = Field(
        ..., description="Full name of the individual", title="Full Name"
    )
    middle_name: Optional[str] = Field(
        None, description="Middle name or initial", title="Middle Name"
    )
    maiden_name: Optional[str] = Field(
        None, description="Maiden name (if applicable)", title="Maiden Name"
    )
    aliases: Optional[List[str]] = Field(
        None, description="Known aliases or nicknames", title="Aliases"
    )

    # Birth Information
    birth_date: Optional[str] = Field(
        None, description="Date of birth", title="Date of Birth"
    )
    birth_place: Optional[Location] = Field(
        None, description="Place of birth", title="Birth Place"
    )
    age: Optional[int] = Field(None, description="Current age", title="Age")

    # Physical Characteristics
    gender: Optional[Literal["male", "female", "other"]] = Field(
        None, description="Gender of the individual", title="Gender"
    )
    height: Optional[str] = Field(
        None, description="Height (e.g., '5ft 10in' or '178cm')", title="Height"
    )
    weight: Optional[str] = Field(
        None, description="Weight (e.g., '170lbs' or '77kg')", title="Weight"
    )
    eye_color: Optional[
        Literal["brown", "blue", "green", "hazel", "gray", "amber", "other"]
    ] = Field(None, description="Eye color", title="Eye Color")
    hair_color: Optional[
        Literal["black", "brown", "blonde", "red", "gray", "white", "bald", "other"]
    ] = Field(None, description="Hair color", title="Hair Color")
    skin_tone: Optional[str] = Field(
        None, description="Skin tone description", title="Skin Tone"
    )
    ethnicity: Optional[str] = Field(
        None, description="Ethnicity or ethnic background", title="Ethnicity"
    )
    blood_type: Optional[Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]] = (
        Field(None, description="Blood type", title="Blood Type")
    )
    distinguishing_marks: Optional[List[str]] = Field(
        None,
        description="Distinguishing marks, scars, tattoos, etc.",
        title="Distinguishing Marks",
    )
    disabilities: Optional[List[str]] = Field(
        None,
        description="Known disabilities or medical conditions",
        title="Disabilities",
    )

    # Health and Lifestyle
    is_smoker: Optional[bool] = Field(
        None, description="Whether the individual smokes", title="Is Smoker"
    )
    is_deceased: Optional[bool] = Field(
        None, description="Whether the individual is deceased", title="Is Deceased"
    )
    death_date: Optional[str] = Field(
        None, description="Date of death (if applicable)", title="Death Date"
    )
    death_place: Optional[Location] = Field(
        None, description="Place of death (if applicable)", title="Death Place"
    )
    cause_of_death: Optional[str] = Field(
        None, description="Cause of death (if applicable)", title="Cause of Death"
    )

    # Contact Information
    phone_numbers: Optional[List[str]] = Field(
        None, description="Known phone numbers", title="Phone Numbers"
    )
    email_addresses: Optional[List[str]] = Field(
        None, description="Known email addresses", title="Email Addresses"
    )
    social_media_profiles: Optional[List[str]] = Field(
        None,
        description="Social media profile URLs or usernames",
        title="Social Media Profiles",
    )

    # Location Information
    current_address: Optional[Location] = Field(
        None, description="Current residential address", title="Current Address"
    )
    previous_addresses: Optional[List[Location]] = Field(
        None, description="Previous known addresses", title="Previous Addresses"
    )
    nationality: Optional[str] = Field(
        None, description="Nationality or country of citizenship", title="Nationality"
    )
    citizenship: Optional[List[str]] = Field(
        None,
        description="Countries of citizenship (dual citizenship possible)",
        title="Citizenship",
    )
    place_of_residence: Optional[str] = Field(
        None,
        description="Current place of residence (city/state/country)",
        title="Place of Residence",
    )

    # Identification Documents
    passport_number: Optional[str] = Field(
        None, description="Passport number", title="Passport Number"
    )
    drivers_license: Optional[str] = Field(
        None, description="Driver's license number", title="Driver's License"
    )
    social_security_number: Optional[str] = Field(
        None, description="Social Security Number (SSN)", title="Social Security Number"
    )
    national_id: Optional[str] = Field(
        None, description="National ID number", title="National ID"
    )
    voter_id: Optional[str] = Field(
        None, description="Voter ID number", title="Voter ID"
    )
    tax_id: Optional[str] = Field(
        None, description="Tax identification number", title="Tax ID"
    )

    # Personal Relationships
    marital_status: Optional[
        Literal[
            "single",
            "married",
            "divorced",
            "widowed",
            "separated",
            "domestic_partnership",
        ]
    ] = Field(None, description="Marital status", title="Marital Status")
    spouse_name: Optional[str] = Field(
        None, description="Name of spouse or partner", title="Spouse Name"
    )
    children_count: Optional[int] = Field(
        None, description="Number of children", title="Children Count"
    )
    children_names: Optional[List[str]] = Field(
        None, description="Names of children", title="Children Names"
    )
    parents_names: Optional[List[str]] = Field(
        None, description="Names of parents", title="Parents Names"
    )
    emergency_contact: Optional[str] = Field(
        None, description="Emergency contact information", title="Emergency Contact"
    )

    # Professional Information
    occupation: Optional[str] = Field(
        None, description="Current occupation or job title", title="Occupation"
    )
    employer: Optional[str] = Field(
        None, description="Current employer", title="Employer"
    )
    employer_address: Optional[Location] = Field(
        None, description="Employer's address", title="Employer Address"
    )
    job_title: Optional[str] = Field(
        None, description="Current job title or position", title="Job Title"
    )
    annual_income: Optional[float] = Field(
        None, description="Annual income", title="Annual Income"
    )
    employment_history: Optional[List[str]] = Field(
        None, description="Previous employment history", title="Employment History"
    )

    # Education
    education_level: Optional[
        Literal["elementary", "high_school", "bachelor", "master", "doctorate", "other"]
    ] = Field(
        None, description="Highest education level achieved", title="Education Level"
    )
    schools_attended: Optional[List[str]] = Field(
        None, description="Schools or universities attended", title="Schools Attended"
    )
    degrees: Optional[List[str]] = Field(
        None, description="Degrees or certifications obtained", title="Degrees"
    )

    # Personal Characteristics
    languages_spoken: Optional[List[str]] = Field(
        None, description="Languages spoken", title="Languages Spoken"
    )
    religion: Optional[str] = Field(
        None, description="Religious affiliation", title="Religion"
    )
    political_affiliation: Optional[str] = Field(
        None, description="Political party affiliation", title="Political Affiliation"
    )
    hobbies: Optional[List[str]] = Field(
        None, description="Known hobbies or interests", title="Hobbies"
    )
    personality_traits: Optional[List[str]] = Field(
        None, description="Known personality traits", title="Personality Traits"
    )

    # Biometric Information
    fingerprints: Optional[str] = Field(
        None, description="Fingerprint data or hash", title="Fingerprints"
    )
    dna_profile: Optional[str] = Field(
        None, description="DNA profile or hash", title="DNA Profile"
    )
    facial_recognition_id: Optional[str] = Field(
        None, description="Facial recognition system ID", title="Facial Recognition ID"
    )
    iris_scan: Optional[str] = Field(
        None, description="Iris scan data or hash", title="Iris Scan"
    )
    voice_print: Optional[str] = Field(
        None, description="Voice print data or hash", title="Voice Print"
    )

    # Financial Information
    bank_accounts: Optional[List[str]] = Field(
        None, description="Known bank account numbers", title="Bank Accounts"
    )
    credit_score: Optional[int] = Field(
        None, description="Credit score", title="Credit Score"
    )
    net_worth: Optional[float] = Field(
        None, description="Estimated net worth", title="Net Worth"
    )
    assets: Optional[List[str]] = Field(
        None, description="Known assets (property, vehicles, etc.)", title="Assets"
    )

    # Legal Information
    criminal_record: Optional[bool] = Field(
        None,
        description="Whether individual has a criminal record",
        title="Criminal Record",
    )
    arrest_history: Optional[List[str]] = Field(
        None, description="Known arrests or charges", title="Arrest History"
    )
    convictions: Optional[List[str]] = Field(
        None, description="Criminal convictions", title="Convictions"
    )
    civil_cases: Optional[List[str]] = Field(
        None, description="Civil court cases", title="Civil Cases"
    )
    security_clearance: Optional[str] = Field(
        None, description="Security clearance level", title="Security Clearance"
    )

    # Digital Footprint
    ip_addresses: Optional[List[str]] = Field(
        None, description="Known IP addresses", title="IP Addresses"
    )
    usernames: Optional[List[str]] = Field(
        None, description="Known online usernames", title="Usernames"
    )
    device_ids: Optional[List[str]] = Field(
        None, description="Known device identifiers", title="Device IDs"
    )

    # Metadata
    first_seen: Optional[str] = Field(
        None,
        description="First time individual was observed in system",
        title="First Seen",
    )
    last_seen: Optional[str] = Field(
        None,
        description="Last time individual was observed in system",
        title="Last Seen",
    )
    source: Optional[str] = Field(
        None, description="Source of individual information", title="Source"
    )
    confidence: Optional[float] = Field(
        None, description="Confidence score for individual data", title="Confidence"
    )
    notes: Optional[str] = Field(
        None, description="Additional notes or observations", title="Notes"
    )
    src: Optional[str] = Field(
        None, description="URL to profile picture", title="Profile Picture URL"
    )
    last_updated: Optional[str] = Field(
        None, description="Last update timestamp", title="Last Updated"
    )
