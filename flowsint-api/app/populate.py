from uuid import uuid4
import random
from faker import Faker
from app.neo4j.connector import Neo4jConnection
import os
from dotenv import load_dotenv
load_dotenv()

URI = os.getenv("NEO4J_URI_BOLT")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")
fake = Faker()
neo4j_connection = Neo4jConnection(URI, USERNAME, PASSWORD)

def generate_emails(person_id, count=1):
    return [
        {
            "id": str(uuid4()),
            "email": fake.email(),
            "person_id": person_id,
            "type":"email"

        }
        for _ in range(count)
    ]

def generate_phones(person_id, count=1):
    return [
        {
            "id": str(uuid4()),
            "number": fake.phone_number(),
            "country": fake.country(),
            "carrier": random.choice(["Orange", "Free", "SFR", "Bouygues"]),
            "person_id": person_id,
            "type":"socials"

        }
        for _ in range(count)
    ]

def generate_socials(person_id, count=1):
    return [
        {
            "id": str(uuid4()),
            "username": fake.user_name(),
            "platform": random.choice(["Twitter", "LinkedIn", "Instagram"]),
            "profile_url": f"https://{random.choice(['twitter.com', 'linkedin.com/in', 'instagram.com'])}/{fake.user_name()}",
            "bio": fake.sentence(),
            "followers_count": random.randint(0, 10000),
            "following_count": random.randint(0, 5000),
            "posts_count": random.randint(0, 1000),
            "person_id": person_id,
            "type":"socials"
        }
        for _ in range(count)
    ]

def generate_addresses(person_id, count=1):
    return [
        {
            "id": str(uuid4()),
            "address": fake.street_address(),
            "city": fake.city(),
            "country": fake.country(),
            "zip": fake.postcode(),
            "latitude": float(fake.latitude()),
            "longitude": float(fake.longitude()),
            "person_id": person_id,
            "type":"address"

        }
        for _ in range(count)
    ]

def generate_websites(person_id, count=1):
    websites = []
    for _ in range(count):
        domain = fake.domain_name()
        ip = fake.ipv4_public()
        websites.append({
            "id": str(uuid4()),
            "url": f"https://{domain}",
            "domain": domain,
            "ip": ip,
            "person_id": person_id,
            "type": "website"
        })
    return websites

def generate_random_sketch():
    organizations = []
    persons = []
    emails, phones, socials, addresses, websites = [], [], [], [], []
    org_links = []
    person_links = []

    # Organizations
    for _ in range(4):
        org_id = str(uuid4())
        organizations.append({
            "id": org_id,
            "name": fake.company(),
            "description": fake.catch_phrase(),
            "country": fake.country(),
            "type": "organization"
        })

    # Individuals
    for _ in range(10):
        person_id = str(uuid4())
        name = fake.name()
        first_name, last_name = name.split()[0], name.split()[-1]

        persons.append({
            "id": person_id,
            "first_name": first_name,
            "last_name": last_name,
            "full_name": name,
            "type": "person"
        })

        emails.extend(generate_emails(person_id, random.randint(1, 2)))
        phones.extend(generate_phones(person_id, random.randint(0, 1)))
        socials.extend(generate_socials(person_id, random.randint(0, 1)))
        addresses.extend(generate_addresses(person_id, random.randint(0, 1)))
        websites.extend(generate_websites(person_id, random.randint(0, 1)))

        if random.random() < 0.7:
            org = random.choice(organizations)
            org_links.append({
                "person_id": person_id,
                "org_id": org["id"]
            })

    # Person-Person relationships
    relationship_types = ["KNOWS", "WORKS_WITH", "FRIEND_OF", "COLLEAGUE"]
    for _ in range(10):
        src, tgt = random.sample(persons, 2)
        person_links.append({
            "source_id": src["id"],
            "target_id": tgt["id"],
            "type": random.choice(relationship_types)
        })

    def create_entities(label: str, props: list[dict], label_fn=None):
        if not props:
            return

        if label_fn:
            for entity in props:
                entity["__labels__"] = label_fn(entity).split(":")  # <- correction ici
            neo4j_connection.query(f"""
            UNWIND $entities AS entity
            CALL apoc.create.node(entity.__labels__, apoc.map.removeKey(entity, '__labels__')) YIELD node
            RETURN count(node);
            """, {"entities": props})
        else:
            neo4j_connection.query(f"""
            UNWIND $entities AS entity
            CREATE (n:{label})
            SET n = entity;
            """, {"entities": props})


    def create_relationships(from_label, to_label, rel_name, from_key, to_key, data):
        if data:
            neo4j_connection.query(f"""
            UNWIND $rows AS row
            MATCH (a:{from_label} {{id: row.{from_key}}}), (b:{to_label} {{id: row.{to_key}}})
            CALL apoc.create.relationship(a, '{rel_name}', {{}}, b) YIELD rel
            RETURN count(rel);
            """, {"rows": data})

    create_entities("Organization", organizations, lambda o: f"Organization:{o['name']}")
    create_entities("Person", persons, lambda p: f"Person:{p['full_name']}")
    create_entities("Email", emails, lambda e: f"Email:{e['email']}")
    create_entities("Phone", phones, lambda p: f"Phone:{p['number']}")
    create_entities("Social", socials, lambda s: f"Social:{s['platform']}:{s['username']}")
    create_entities("Address", addresses, lambda a: f"Address:{a['city']}")
    create_entities("Website", websites, lambda w: f"Website:{w['domain']}")


    create_relationships("Person", "Email", "HAS_EMAIL", "person_id", "id", emails)
    create_relationships("Person", "Phone", "HAS_PHONE", "person_id", "id", phones)
    create_relationships("Person", "Social", "HAS_SOCIAL", "person_id", "id", socials)
    create_relationships("Person", "Address", "HAS_ADDRESS", "person_id", "id", addresses)
    create_relationships("Person", "Website", "HAS_WEBSITE", "person_id", "id", websites)
    create_relationships("Person", "Organization", "MEMBER_OF", "person_id", "org_id", org_links)

    for rel_type in set(r["type"] for r in person_links):
        rels = [r for r in person_links if r["type"] == rel_type]
        create_relationships("Person", "Person", rel_type, "source_id", "target_id", rels)

    return {"status": "success", "message": "Sketch created with entities and relationships."}
