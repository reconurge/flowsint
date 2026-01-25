// 001_indexes.cypher
// Foundation indexes for query performance
// All statements are idempotent (IF NOT EXISTS)

// Index for filtering nodes by sketch_id (most common query pattern)
CREATE INDEX idx_sketch_id IF NOT EXISTS FOR (n:domain) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_email IF NOT EXISTS FOR (n:email) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_ip IF NOT EXISTS FOR (n:ip) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_phone IF NOT EXISTS FOR (n:phone) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_username IF NOT EXISTS FOR (n:username) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_organization IF NOT EXISTS FOR (n:organization) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_individual IF NOT EXISTS FOR (n:individual) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_socialaccount IF NOT EXISTS FOR (n:socialaccount) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_asn IF NOT EXISTS FOR (n:asn) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_cidr IF NOT EXISTS FOR (n:cidr) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_cryptowallet IF NOT EXISTS FOR (n:cryptowallet) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_cryptowallettransaction IF NOT EXISTS FOR (n:cryptowallettransaction) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_cryptonft IF NOT EXISTS FOR (n:cryptonft) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_website IF NOT EXISTS FOR (n:website) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_port IF NOT EXISTS FOR (n:port) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_phrase IF NOT EXISTS FOR (n:phrase) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_breach IF NOT EXISTS FOR (n:breach) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_credential IF NOT EXISTS FOR (n:credential) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_device IF NOT EXISTS FOR (n:device) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_document IF NOT EXISTS FOR (n:document) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_file IF NOT EXISTS FOR (n:file) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_malware IF NOT EXISTS FOR (n:malware) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_sslcertificate IF NOT EXISTS FOR (n:sslcertificate) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_location IF NOT EXISTS FOR (n:location) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_affiliation IF NOT EXISTS FOR (n:affiliation) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_alias IF NOT EXISTS FOR (n:alias) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_bankaccount IF NOT EXISTS FOR (n:bankaccount) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_creditcard IF NOT EXISTS FOR (n:creditcard) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_dnsrecord IF NOT EXISTS FOR (n:dnsrecord) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_gravatar IF NOT EXISTS FOR (n:gravatar) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_leak IF NOT EXISTS FOR (n:leak) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_message IF NOT EXISTS FOR (n:message) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_reputationscore IF NOT EXISTS FOR (n:reputationscore) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_riskprofile IF NOT EXISTS FOR (n:riskprofile) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_script IF NOT EXISTS FOR (n:script) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_session IF NOT EXISTS FOR (n:session) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_webtracker IF NOT EXISTS FOR (n:webtracker) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_weapon IF NOT EXISTS FOR (n:weapon) ON (n.sketch_id);
CREATE INDEX idx_sketch_id_whois IF NOT EXISTS FOR (n:whois) ON (n.sketch_id);

// Index for searching by nodeLabel (text search on common types)
CREATE INDEX idx_nodeLabel_domain IF NOT EXISTS FOR (n:domain) ON (n.nodeLabel);
CREATE INDEX idx_nodeLabel_email IF NOT EXISTS FOR (n:email) ON (n.nodeLabel);
CREATE INDEX idx_nodeLabel_ip IF NOT EXISTS FOR (n:ip) ON (n.nodeLabel);
CREATE INDEX idx_nodeLabel_phone IF NOT EXISTS FOR (n:phone) ON (n.nodeLabel);
CREATE INDEX idx_nodeLabel_username IF NOT EXISTS FOR (n:username) ON (n.nodeLabel);
CREATE INDEX idx_nodeLabel_individual IF NOT EXISTS FOR (n:individual) ON (n.nodeLabel);
CREATE INDEX idx_nodeLabel_organization IF NOT EXISTS FOR (n:organization) ON (n.nodeLabel);
CREATE INDEX idx_nodeLabel_socialaccount IF NOT EXISTS FOR (n:socialaccount) ON (n.nodeLabel);
CREATE INDEX idx_nodeLabel_website IF NOT EXISTS FOR (n:website) ON (n.nodeLabel);
CREATE INDEX idx_nodeLabel_cryptowallet IF NOT EXISTS FOR (n:cryptowallet) ON (n.nodeLabel);
