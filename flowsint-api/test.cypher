// Définir le sketch_id
WITH "fe8a0a8e-2fed-4149-9353-3c1293ea6d65" AS sketchId

// 1. Créer 3 organisations
UNWIND range(1, 3) AS i
CREATE (:Organization {
  id: randomUUID(),
  name: 'Org ' + i,
  label: 'Org ' + i,
  type: 'organization',
  sketch_id: sketchId
});

// 2. Créer 10 individuals liés aux organisations
WITH "fe8a0a8e-2fed-4149-9353-3c1293ea6d65" AS sketchId
MATCH (org:Organization)
WITH collect(org) AS orgs, sketchId
UNWIND range(1, 10) AS i
WITH orgs[toInteger(rand() * size(orgs))] AS org, i, sketchId
CREATE (ind:Individual {
  id: randomUUID(),
  name: 'Person ' + i,
  label: 'Person ' + i,
  type: 'individual',
  sketch_id: sketchId
})
CREATE (ind)-[:WORKS_FOR { sketch_id: sketchId, type: 'WORKS_FOR', label: 'works for' }]->(org);

// 3. Créer 5 domaines liés aux organisations
WITH "fe8a0a8e-2fed-4149-9353-3c1293ea6d65" AS sketchId
MATCH (org:Organization)
WITH collect(org) AS orgs, sketchId
UNWIND range(1, 5) AS i
WITH orgs[toInteger(rand() * size(orgs))] AS org, i, sketchId
CREATE (d:Domain {
  id: randomUUID(),
  name: 'example' + i + '.com',
  label: 'example' + i + '.com',
  type: 'domain',
  sketch_id: sketchId
})
CREATE (d)-[:OWNED_BY { sketch_id: sketchId, type: 'OWNED_BY', label: 'owned by' }]->(org);

// 4. Créer 10 subdomains liés aux domaines
WITH "fe8a0a8e-2fed-4149-9353-3c1293ea6d65" AS sketchId
MATCH (d:Domain)
WITH collect(d) AS domains, sketchId
UNWIND range(1, 10) AS i
WITH domains[toInteger(rand() * size(domains))] AS domain, i, sketchId
CREATE (sd:Subdomain {
  id: randomUUID(),
  name: 'sub' + i + '.' + domain.name,
  label: 'sub' + i + '.' + domain.name,
  type: 'subdomain',
  sketch_id: sketchId
})
CREATE (sd)-[:SUBDOMAIN_OF { sketch_id: sketchId, type: 'SUBDOMAIN_OF', label: 'subdomain of' }]->(domain);

// 5. Créer 10 usernames liés à des individuals
WITH "fe8a0a8e-2fed-4149-9353-3c1293ea6d65" AS sketchId
MATCH (ind:Individual)
WITH collect(ind) AS individuals, sketchId
UNWIND range(1, 10) AS i
WITH individuals[toInteger(rand() * size(individuals))] AS person, i, sketchId
CREATE (u:Username {
  id: randomUUID(),
  name: 'user' + i,
  label: 'user' + i,
  type: 'username',
  sketch_id: sketchId
})
CREATE (u)-[:ALIAS_OF { sketch_id: sketchId, type: 'ALIAS_OF', label: 'alias of' }]->(person);

// 6. Créer 10 social_profiles liés aux usernames
WITH "fe8a0a8e-2fed-4149-9353-3c1293ea6d65" AS sketchId
MATCH (u:Username)
WITH collect(u) AS usernames, sketchId,
     ['twitter', 'linkedin', 'github', 'facebook'] AS platforms
UNWIND usernames AS uname
WITH uname, platforms[toInteger(rand() * size(platforms))] AS platform, sketchId
CREATE (sp:SocialProfile {
  id: randomUUID(),
  platform: platform,
  profile_url: 'https://' + platform + '.com/' + uname.name,
  label: uname.name + ' on ' + platform,
  type: 'social_profile',
  sketch_id: sketchId
})
CREATE (sp)-[:ASSOCIATED_WITH { sketch_id: sketchId, type: 'ASSOCIATED_WITH', label: 'associated with' }]->(uname);


// Relier les organisations entre elles pour unifier le graphe
WITH "fe8a0a8e-2fed-4149-9353-3c1293ea6d65" AS sketchId
MATCH (o1:Organization), (o2:Organization)
WHERE id(o1) < id(o2)  // éviter les doublons et self-loop
MERGE (o1)-[:RELATED_TO { sketch_id: sketchId, type: 'RELATED_TO', label: 'related to' }]->(o2)
