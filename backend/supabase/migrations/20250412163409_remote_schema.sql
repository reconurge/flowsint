

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgmq" WITH SCHEMA "pgmq";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."investigation_status" AS ENUM (
    'active',
    'pending',
    'archived'
);


ALTER TYPE "public"."investigation_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."investigation_status" IS 'Describes the possible statuses of an investigation.';



CREATE OR REPLACE FUNCTION "public"."handle_new_investigation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  INSERT INTO investigations_profiles (investigation_id, profile_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."handle_new_investigation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_project"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$begin
  insert into projects_profiles (project_id, profile_id)
  values (new.id, auth.uid());
  return new;
end;$$;


ALTER FUNCTION "public"."handle_new_project"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_sketch"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  INSERT INTO sketches_profiles (sketch_id, profile_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."handle_new_sketch"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_investigation_profile_from_sketch"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    inv_id UUID;
BEGIN
    -- Récupère l'investigation_id associé au sketch_id
    SELECT investigation_id INTO inv_id
    FROM sketches
    WHERE id = NEW.sketch_id;

    -- Vérifie que ce couple n'existe pas déjà (optionnel selon tes contraintes)
    IF NOT EXISTS (
        SELECT 1 FROM investigations_profiles
        WHERE profile_id = NEW.profile_id AND investigation_id = inv_id
    ) THEN
        -- Insère le lien dans investigations_profiles
        INSERT INTO investigations_profiles(profile_id, investigation_id)
        VALUES (NEW.profile_id, inv_id);
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_investigation_profile_from_sketch"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_investigation_last_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
    -- Si la mise à jour concerne 'investigations', mettre à jour 'projects' uniquement si 10s sont écoulées
    IF TG_TABLE_NAME = 'sketches' THEN
        IF OLD.last_updated_at IS NULL OR OLD.last_updated_at < NOW() - INTERVAL '10 seconds' THEN
            UPDATE investigations
            SET last_updated_at = NOW()
            WHERE id = NEW.investigation_id;
            UPDATE sketches
            SET last_updated_at = NOW()
            WHERE id = NEW.id;
        END IF;

    -- Si la mise à jour concerne une table liée, mettre à jour 'investigations' et 'projects' seulement si 10s sont écoulées
    ELSIF TG_TABLE_NAME IN ('emails', 'individuals', 'relationships', 'physical_addresses', 'social_accounts', 'ip_addresses', 'phones') THEN
        IF (SELECT last_updated_at FROM sketches WHERE id = NEW.sketch_id) < NOW() - INTERVAL '10 seconds' THEN
            UPDATE sketches
            SET last_updated_at = NOW()
            WHERE id = NEW.sketch_id;

            UPDATE investigations
            SET last_updated_at = NOW()
            WHERE id = (
                SELECT investigation_id FROM sketches WHERE id = NEW.sketch_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;$$;


ALTER FUNCTION "public"."update_investigation_last_updated"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_last_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_TABLE_NAME = 'sketches' THEN
    IF OLD.last_updated_at IS NULL OR OLD.last_updated_at < NOW() - INTERVAL '10 seconds' THEN
      UPDATE investigations
      SET last_updated_at = NOW()
      WHERE id = NEW.investigation_id;

      UPDATE sketches
      SET last_updated_at = NOW()
      WHERE id = NEW.id;
    END IF;

  ELSIF TG_TABLE_NAME IN (
    'emails', 'individuals', 'relationships', 
    'physical_addresses', 'social_accounts', 
    'ip_addresses', 'phones'
  ) THEN
    IF (SELECT last_updated_at FROM sketches WHERE id = NEW.sketch_id) IS NULL OR 
       (SELECT last_updated_at FROM sketches WHERE id = NEW.sketch_id) < NOW() - INTERVAL '10 seconds' THEN
      UPDATE sketches
      SET last_updated_at = NOW()
      WHERE id = NEW.sketch_id;

      UPDATE investigations
      SET last_updated_at = NOW()
      WHERE id = (
        SELECT investigation_id FROM sketches WHERE id = NEW.sketch_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_last_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_sketch_last_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  IF (SELECT last_updated_at FROM sketches WHERE id = NEW.id) IS NULL OR 
     (SELECT last_updated_at FROM sketches WHERE id = NEW.id) < NOW() - INTERVAL '10 seconds' THEN
    UPDATE investigations
    SET last_updated_at = NOW()
    WHERE id = NEW.investigation_id;
  END IF;

  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."update_sketch_last_updated"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accounts_breaches" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account" "text",
    "breach_id" bigint
);


ALTER TABLE "public"."accounts_breaches" OWNER TO "postgres";


ALTER TABLE "public"."accounts_breaches" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."accounts_breaches_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."breaches" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "raw_content" "jsonb"
);


ALTER TABLE "public"."breaches" OWNER TO "postgres";


ALTER TABLE "public"."breaches" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."breaches_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."emails" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "individual_id" "uuid",
    "sketch_id" "uuid",
    "email" "text",
    "breach_found" boolean DEFAULT false,
    "organization_id" "uuid",
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text")
);


ALTER TABLE "public"."emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedbacks" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "text",
    "owner_id" "uuid" DEFAULT "auth"."uid"()
);


ALTER TABLE "public"."feedbacks" OWNER TO "postgres";


ALTER TABLE "public"."feedbacks" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."feedbacks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "label" "text",
    "sketch_id" "uuid"
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."individuals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sketch_id" "uuid",
    "full_name" "text",
    "birth_date" "date",
    "gender" "text",
    "nationality" "text",
    "notes" "jsonb",
    "image_url" "text",
    "group_id" "uuid",
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text")
);


ALTER TABLE "public"."individuals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."individuals_individuals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "individual_a" "uuid",
    "individual_b" "uuid",
    "sketch_id" "uuid",
    "relation_type" "text",
    "confidence_level" integer,
    CONSTRAINT "relationships_confidence_level_check" CHECK ((("confidence_level" >= 1) AND ("confidence_level" <= 100)))
);


ALTER TABLE "public"."individuals_individuals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investigations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "description" "text",
    "owner_id" "uuid" DEFAULT "auth"."uid"(),
    "last_updated_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text")
);


ALTER TABLE "public"."investigations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investigations_profiles" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "investigation_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL
);


ALTER TABLE "public"."investigations_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sketches_profiles" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "profile_id" "uuid",
    "sketch_id" "uuid",
    "role" "text" DEFAULT 'editor'::"text"
);


ALTER TABLE "public"."sketches_profiles" OWNER TO "postgres";


ALTER TABLE "public"."sketches_profiles" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."investigations_profiles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."ip_addresses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "individual_id" "uuid",
    "sketch_id" "uuid",
    "ip_address" "text",
    "geolocation" "jsonb",
    "last_seen" timestamp without time zone DEFAULT "now"(),
    "organization_id" "uuid",
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text")
);


ALTER TABLE "public"."ip_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "registration_number" "text",
    "founding_date" "text",
    "sketch_id" "uuid",
    "name" "text"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations_individuals" (
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text"),
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "individual_id" "uuid",
    "organization_id" "uuid",
    "sketch_id" "uuid",
    "relation_type" "text"
);


ALTER TABLE "public"."organizations_individuals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations_organizations" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_a" "uuid",
    "organization_b" "uuid",
    "relation_type" "text" DEFAULT 'subsidiary'::"text",
    "sketch_id" "uuid"
);


ALTER TABLE "public"."organizations_organizations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."organization_graph" WITH ("security_invoker"='on') AS
 WITH "related_organizations" AS (
         SELECT "o_1"."id" AS "organization_id",
            "o_1"."name"
           FROM "public"."organizations" "o_1"
        UNION
         SELECT "oo"."organization_b" AS "organization_id",
            "o_1"."name"
           FROM ("public"."organizations_organizations" "oo"
             JOIN "public"."organizations" "o_1" ON (("oo"."organization_b" = "o_1"."id")))
        ), "related_individuals" AS (
         SELECT "i"."id" AS "individual_id",
            "i"."full_name",
            "oi"."organization_id"
           FROM (("public"."organizations_individuals" "oi"
             JOIN "public"."individuals" "i" ON (("oi"."individual_id" = "i"."id")))
             JOIN "related_organizations" "ro" ON (("oi"."organization_id" = "ro"."organization_id")))
        ), "organization_nodes" AS (
         SELECT "ro"."organization_id",
            "jsonb_build_object"('id', ("ro"."organization_id")::"text", 'type', 'custom', 'data', "jsonb_build_object"('id', "ro"."organization_id", 'name', "ro"."name", 'label', "ro"."name", 'type', 'organization'), 'position', "jsonb_build_object"('x', 200, 'y', 0)) AS "node"
           FROM "related_organizations" "ro"
        ), "individual_nodes" AS (
         SELECT "ri"."organization_id",
            "jsonb_build_object"('id', ("ri"."individual_id")::"text", 'type', 'custom', 'data', "jsonb_build_object"('id', "ri"."individual_id", 'full_name', "ri"."full_name", 'label', "ri"."full_name", 'type', 'individual'), 'position', "jsonb_build_object"('x', 0, 'y', 100)) AS "node"
           FROM "related_individuals" "ri"
        ), "organization_edges" AS (
         SELECT "oo"."organization_a" AS "organization_id",
            "jsonb_build_object"('id', "concat"('org-org-', "oo"."id"), 'source', ("oo"."organization_a")::"text", 'target', ("oo"."organization_b")::"text", 'type', 'custom', 'label', COALESCE("oo"."relation_type", 'related'::"text"), 'data', "jsonb_build_object"('relation_type', "oo"."relation_type")) AS "edge"
           FROM "public"."organizations_organizations" "oo"
          WHERE (("oo"."organization_a" IS NOT NULL) AND ("oo"."organization_b" IS NOT NULL) AND (EXISTS ( SELECT 1
                   FROM "related_organizations" "ro"
                  WHERE ("ro"."organization_id" = "oo"."organization_a"))))
        ), "org_individual_edges" AS (
         SELECT "oi"."organization_id",
            "jsonb_build_object"('id', "concat"('org-ind-', "oi"."id"), 'source', ("oi"."organization_id")::"text", 'target', ("oi"."individual_id")::"text", 'type', 'custom', 'label', COALESCE("oi"."relation_type", 'employee'::"text"), 'data', "jsonb_build_object"('relation_type', "oi"."relation_type")) AS "edge"
           FROM "public"."organizations_individuals" "oi"
          WHERE (EXISTS ( SELECT 1
                   FROM "related_organizations" "ro"
                  WHERE ("ro"."organization_id" = "oi"."organization_id")))
        ), "individual_edges" AS (
         SELECT "ri"."organization_id",
            "jsonb_build_object"('id', "concat"('ind-ind-', "r"."id"), 'source', ("r"."individual_a")::"text", 'target', ("r"."individual_b")::"text", 'type', 'custom', 'label', COALESCE("r"."relation_type", 'related'::"text"), 'data', "jsonb_build_object"('confidence_level', "r"."confidence_level", 'relation_type', "r"."relation_type")) AS "edge"
           FROM ("public"."individuals_individuals" "r"
             JOIN "related_individuals" "ri" ON (("r"."individual_a" = "ri"."individual_id")))
          WHERE (("r"."individual_a" IS NOT NULL) AND ("r"."individual_b" IS NOT NULL) AND (EXISTS ( SELECT 1
                   FROM "related_individuals" "ri2"
                  WHERE ("ri2"."individual_id" = "r"."individual_b"))))
        ), "nodes_by_organization" AS (
         SELECT "all_nodes"."organization_id",
            "json_agg"(DISTINCT "all_nodes"."node") AS "nodes"
           FROM ( SELECT "organization_nodes"."organization_id",
                    "organization_nodes"."node"
                   FROM "organization_nodes"
                UNION ALL
                 SELECT "individual_nodes"."organization_id",
                    "individual_nodes"."node"
                   FROM "individual_nodes") "all_nodes"
          GROUP BY "all_nodes"."organization_id"
        ), "edges_by_organization" AS (
         SELECT "all_edges"."organization_id",
            "json_agg"(DISTINCT "all_edges"."edge") AS "edges"
           FROM ( SELECT "organization_edges"."organization_id",
                    "organization_edges"."edge"
                   FROM "organization_edges"
                UNION ALL
                 SELECT "org_individual_edges"."organization_id",
                    "org_individual_edges"."edge"
                   FROM "org_individual_edges"
                UNION ALL
                 SELECT "individual_edges"."organization_id",
                    "individual_edges"."edge"
                   FROM "individual_edges") "all_edges"
          GROUP BY "all_edges"."organization_id"
        )
 SELECT "o"."id" AS "organization_id",
    "o"."name" AS "organization_name",
    COALESCE("n"."nodes", '[]'::"json") AS "nodes",
    COALESCE("e"."edges", '[]'::"json") AS "edges"
   FROM (("public"."organizations" "o"
     LEFT JOIN "nodes_by_organization" "n" ON (("n"."organization_id" = "o"."id")))
     LEFT JOIN "edges_by_organization" "e" ON (("e"."organization_id" = "o"."id")));


ALTER TABLE "public"."organization_graph" OWNER TO "postgres";


ALTER TABLE "public"."organizations_organizations" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."organizations_organizations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."phones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "individual_id" "uuid",
    "sketch_id" "uuid",
    "phone_number" "text",
    "country" "text",
    "organization_id" "uuid",
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text")
);


ALTER TABLE "public"."phones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."physical_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "address" "text",
    "city" "text",
    "country" "text",
    "zip" "text",
    "sketch_id" "uuid",
    "individual_id" "uuid",
    "organization_id" "uuid"
);


ALTER TABLE "public"."physical_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


ALTER TABLE "public"."investigations_profiles" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."projects_profiles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."scans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text",
    "scan_name" "text",
    "results" "jsonb",
    "value" "text",
    "sketch_id" "uuid"
);


ALTER TABLE "public"."scans" OWNER TO "postgres";


COMMENT ON COLUMN "public"."scans"."value" IS 'The value that was searched for. Can be a username, an email, an IP address, etc.';



CREATE OR REPLACE VIEW "public"."sketch_graph" AS
SELECT
    NULL::"uuid" AS "sketch_id",
    NULL::"json" AS "nodes",
    NULL::"json" AS "edges",
    NULL::bigint AS "debug_relationship_count";


ALTER TABLE "public"."sketch_graph" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_accounts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "individual_id" "uuid",
    "sketch_id" "uuid",
    "platform" "text",
    "username" "text",
    "profile_url" "text",
    "last_seen" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text"),
    "organization_id" "uuid",
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text")
);


ALTER TABLE "public"."social_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "model" "text",
    "brand" "text",
    "year" "text",
    "plate" "text",
    "type" "text",
    "sketch_id" "uuid",
    "individual_id" "uuid",
    "organization_id" "uuid",
    "color" "text"
);


ALTER TABLE "public"."vehicles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."websites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sketch_id" "uuid",
    "individual_id" "uuid",
    "registration_date" "text",
    "url" "text",
    "registrar" "text",
    "ip_address" "text",
    "organization_id" "uuid"
);


ALTER TABLE "public"."websites" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."sketch_table" WITH ("security_invoker"='on') AS
 SELECT "all_entities"."sketch_id",
    "jsonb_agg"("jsonb_build_object"('id', "all_entities"."id", 'data', "all_entities"."data")) AS "data"
   FROM ( SELECT "organizations"."id",
            "organizations"."sketch_id",
            "jsonb_build_object"('id', "organizations"."id", 'type', 'organization', 'label', "organizations"."name", 'name', "organizations"."name", 'registration_number', "organizations"."registration_number", 'founding_date', "organizations"."founding_date", 'created_at', "organizations"."created_at") AS "data"
           FROM "public"."organizations"
        UNION ALL
         SELECT "individuals"."id",
            "individuals"."sketch_id",
            "jsonb_build_object"('id', "individuals"."id", 'type', 'individual', 'label', "individuals"."full_name", 'full_name', "individuals"."full_name", 'birth_date', "individuals"."birth_date", 'gender', "individuals"."gender", 'nationality', "individuals"."nationality", 'notes', "individuals"."notes", 'image_url', "individuals"."image_url", 'created_at', "individuals"."created_at") AS "data"
           FROM "public"."individuals"
        UNION ALL
         SELECT "emails"."id",
            "emails"."sketch_id",
            "jsonb_build_object"('id', "emails"."id", 'type', 'email', 'label', "emails"."email", 'email', "emails"."email", 'breach_found', "emails"."breach_found", 'created_at', "emails"."created_at") AS "data"
           FROM "public"."emails"
        UNION ALL
         SELECT "phones"."id",
            "phones"."sketch_id",
            "jsonb_build_object"('id', "phones"."id", 'type', 'phone', 'label', "phones"."phone_number", 'phone_number', "phones"."phone_number", 'country', "phones"."country", 'created_at', "phones"."created_at") AS "data"
           FROM "public"."phones"
        UNION ALL
         SELECT "websites"."id",
            "websites"."sketch_id",
            "jsonb_build_object"('id', "websites"."id", 'type', 'website', 'label', "websites"."url", 'url', "websites"."url", 'registration_date', "websites"."registration_date", 'registrar', "websites"."registrar", 'ip_address', "websites"."ip_address", 'created_at', "websites"."created_at") AS "data"
           FROM "public"."websites"
        UNION ALL
         SELECT "social_accounts"."id",
            "social_accounts"."sketch_id",
            "jsonb_build_object"('id', "social_accounts"."id", 'type', 'social', 'label', "concat"("social_accounts"."username", '(', "social_accounts"."platform", ')'), 'platform', "social_accounts"."platform", 'username', "social_accounts"."username", 'profile_url', "social_accounts"."profile_url", 'last_seen', "social_accounts"."last_seen", 'created_at', "social_accounts"."created_at") AS "data"
           FROM "public"."social_accounts"
        UNION ALL
         SELECT "ip_addresses"."id",
            "ip_addresses"."sketch_id",
            "jsonb_build_object"('id', "ip_addresses"."id", 'type', 'ip', 'label', "ip_addresses"."ip_address", 'ip_address', "ip_addresses"."ip_address", 'geolocation', "ip_addresses"."geolocation", 'last_seen', "ip_addresses"."last_seen", 'created_at', "ip_addresses"."created_at") AS "data"
           FROM "public"."ip_addresses"
        UNION ALL
         SELECT "vehicles"."id",
            "vehicles"."sketch_id",
            "jsonb_build_object"('id', "vehicles"."id", 'type', 'vehicle', 'label', "concat"("vehicles"."brand", '', "vehicles"."model", ': ', "vehicles"."plate"), 'plate', "vehicles"."plate", 'brand', "vehicles"."brand", 'model', "vehicles"."model", 'color', "vehicles"."color", 'created_at', "vehicles"."created_at") AS "data"
           FROM "public"."vehicles"
        UNION ALL
         SELECT "physical_addresses"."id",
            "physical_addresses"."sketch_id",
            "jsonb_build_object"('id', "physical_addresses"."id", 'type', 'address', 'label', "concat"("physical_addresses"."address", ' ', "physical_addresses"."city", ' ', "physical_addresses"."country"), 'address', "physical_addresses"."address", 'city', "physical_addresses"."city", 'country', "physical_addresses"."country", 'zip', "physical_addresses"."zip", 'created_at', "physical_addresses"."created_at") AS "data"
           FROM "public"."physical_addresses") "all_entities"
  GROUP BY "all_entities"."sketch_id";


ALTER TABLE "public"."sketch_table" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sketches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text",
    "description" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "owner_id" "uuid" DEFAULT "auth"."uid"(),
    "status" "public"."investigation_status" DEFAULT 'active'::"public"."investigation_status",
    "investigation_id" "uuid" NOT NULL,
    "last_updated_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text")
);


ALTER TABLE "public"."sketches" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accounts_breaches"
    ADD CONSTRAINT "accounts_breaches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."breaches"
    ADD CONSTRAINT "breaches_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."breaches"
    ADD CONSTRAINT "breaches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedbacks"
    ADD CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."individuals"
    ADD CONSTRAINT "individuals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sketches"
    ADD CONSTRAINT "investigations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sketches_profiles"
    ADD CONSTRAINT "investigations_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sketches_profiles"
    ADD CONSTRAINT "investigations_profiles_unique_profile_investigation" UNIQUE ("profile_id", "sketch_id");



ALTER TABLE ONLY "public"."ip_addresses"
    ADD CONSTRAINT "ip_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations_individuals"
    ADD CONSTRAINT "organizations_individuals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations_organizations"
    ADD CONSTRAINT "organizations_organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phones"
    ADD CONSTRAINT "phones_phone_number_key" UNIQUE ("phone_number");



ALTER TABLE ONLY "public"."phones"
    ADD CONSTRAINT "phones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."physical_addresses"
    ADD CONSTRAINT "physical_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investigations"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investigations_profiles"
    ADD CONSTRAINT "projects_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investigations_profiles"
    ADD CONSTRAINT "projects_profiles_unique_profile_project" UNIQUE ("profile_id", "investigation_id");



ALTER TABLE ONLY "public"."individuals_individuals"
    ADD CONSTRAINT "relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_accounts"
    ADD CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."individuals_individuals"
    ADD CONSTRAINT "unique_relationship" UNIQUE ("individual_a", "individual_b");



ALTER TABLE ONLY "public"."accounts_breaches"
    ADD CONSTRAINT "unique_relationship_breaches" UNIQUE ("breach_id", "account");



ALTER TABLE ONLY "public"."individuals_individuals"
    ADD CONSTRAINT "unique_relationship_individuals" UNIQUE ("individual_a", "individual_b");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_emails_sketch_id" ON "public"."emails" USING "btree" ("sketch_id");



CREATE INDEX "idx_individuals_individuals_sketch_id" ON "public"."individuals_individuals" USING "btree" ("sketch_id");



CREATE INDEX "idx_individuals_sketch_id" ON "public"."individuals" USING "btree" ("sketch_id");



CREATE INDEX "idx_investigations_id" ON "public"."investigations" USING "btree" ("id");



CREATE INDEX "idx_investigations_owner_id" ON "public"."investigations" USING "btree" ("owner_id");



CREATE INDEX "idx_investigations_profiles_investigation_id" ON "public"."investigations_profiles" USING "btree" ("investigation_id");



CREATE INDEX "idx_investigations_profiles_profile_id" ON "public"."investigations_profiles" USING "btree" ("profile_id");



CREATE INDEX "idx_ip_addresses_sketch_id" ON "public"."ip_addresses" USING "btree" ("sketch_id");



CREATE INDEX "idx_organizations_individuals_sketch_id" ON "public"."organizations_individuals" USING "btree" ("sketch_id");



CREATE INDEX "idx_organizations_organizations_sketch_id" ON "public"."organizations_organizations" USING "btree" ("sketch_id");



CREATE INDEX "idx_organizations_sketch_id" ON "public"."organizations" USING "btree" ("sketch_id");



CREATE INDEX "idx_phones_sketch_id" ON "public"."phones" USING "btree" ("sketch_id");



CREATE INDEX "idx_scans_sketch_id" ON "public"."scans" USING "btree" ("sketch_id");



CREATE INDEX "idx_sketches_investigation_id" ON "public"."sketches" USING "btree" ("investigation_id");



CREATE INDEX "idx_sketches_owner_id" ON "public"."sketches" USING "btree" ("owner_id");



CREATE INDEX "idx_sketches_profiles_profile_id" ON "public"."sketches_profiles" USING "btree" ("profile_id");



CREATE INDEX "idx_sketches_profiles_sketch_id" ON "public"."sketches_profiles" USING "btree" ("sketch_id");



CREATE INDEX "idx_social_accounts_sketch_id" ON "public"."social_accounts" USING "btree" ("sketch_id");



CREATE INDEX "idx_vehicles_sketch_id" ON "public"."vehicles" USING "btree" ("sketch_id");



CREATE INDEX "idx_websites_sketch_id" ON "public"."websites" USING "btree" ("sketch_id");



CREATE OR REPLACE VIEW "public"."sketch_graph" WITH ("security_invoker"='on') AS
 WITH "individual_data" AS (
         SELECT "i"."id",
            "i"."full_name",
            "i"."sketch_id",
            "json_agg"(DISTINCT "jsonb_build_object"('id', "e_1"."id", 'email', "e_1"."email")) FILTER (WHERE ("e_1"."id" IS NOT NULL)) AS "emails",
            "json_agg"(DISTINCT "jsonb_build_object"('id', "p"."id", 'phone_number', "p"."phone_number")) FILTER (WHERE ("p"."id" IS NOT NULL)) AS "phones",
            "json_agg"(DISTINCT "jsonb_build_object"('id', "s"."id", 'platform', "s"."platform", 'username', "s"."username")) FILTER (WHERE ("s"."id" IS NOT NULL)) AS "social_accounts",
            "json_agg"(DISTINCT "jsonb_build_object"('id', "ip"."id", 'ip_address', "ip"."ip_address")) FILTER (WHERE ("ip"."id" IS NOT NULL)) AS "ip_addresses",
            "json_agg"(DISTINCT "jsonb_build_object"('id', "v"."id", 'plate', "v"."plate", 'model', "v"."model", 'brand', "v"."brand", 'type', "v"."type")) FILTER (WHERE ("v"."id" IS NOT NULL)) AS "vehicles",
            "json_agg"(DISTINCT "jsonb_build_object"('id', "w"."id", 'url', "w"."url", 'registration_date', "w"."registration_date", 'registrar', "w"."registrar", 'ip_address', "w"."ip_address")) FILTER (WHERE ("w"."id" IS NOT NULL)) AS "websites",
            "json_agg"(DISTINCT "jsonb_build_object"('id', "pa"."id", 'address', "pa"."address", 'city', "pa"."city", 'country', "pa"."country")) FILTER (WHERE ("pa"."id" IS NOT NULL)) AS "physical_addresses"
           FROM ((((((("public"."individuals" "i"
             LEFT JOIN "public"."emails" "e_1" ON (("i"."id" = "e_1"."individual_id")))
             LEFT JOIN "public"."phones" "p" ON (("i"."id" = "p"."individual_id")))
             LEFT JOIN "public"."social_accounts" "s" ON (("i"."id" = "s"."individual_id")))
             LEFT JOIN "public"."ip_addresses" "ip" ON (("i"."id" = "ip"."individual_id")))
             LEFT JOIN "public"."vehicles" "v" ON (("i"."id" = "v"."individual_id")))
             LEFT JOIN "public"."websites" "w" ON (("i"."id" = "w"."individual_id")))
             LEFT JOIN "public"."physical_addresses" "pa" ON (("i"."id" = "pa"."individual_id")))
          GROUP BY "i"."id"
        ), "organization_data" AS (
         SELECT "o"."id",
            "o"."name",
            "o"."registration_number",
            "o"."founding_date",
            "o"."sketch_id",
            "json_agg"(DISTINCT "jsonb_build_object"('id', "poa"."id", 'address', "poa"."address", 'city', "poa"."city", 'country', "poa"."country")) FILTER (WHERE ("poa"."id" IS NOT NULL)) AS "addresses",
            "json_agg"(DISTINCT "jsonb_build_object"('id', "op"."id", 'phone_number', "op"."phone_number")) FILTER (WHERE ("op"."id" IS NOT NULL)) AS "phones",
            "json_agg"(DISTINCT "jsonb_build_object"('id', "e_1"."id", 'email', "e_1"."email")) FILTER (WHERE ("e_1"."id" IS NOT NULL)) AS "emails",
            "json_agg"(DISTINCT "jsonb_build_object"('id', "s"."id", 'platform', "s"."platform", 'username', "s"."username")) FILTER (WHERE ("s"."id" IS NOT NULL)) AS "social_accounts",
            "json_agg"(DISTINCT "jsonb_build_object"('id', "ip"."id", 'ip_address', "ip"."ip_address")) FILTER (WHERE ("ip"."id" IS NOT NULL)) AS "ip_addresses",
            "json_agg"(DISTINCT "jsonb_build_object"('id', "v"."id", 'plate', "v"."plate", 'model', "v"."model", 'type', "v"."type", 'brand', "v"."brand")) FILTER (WHERE ("v"."id" IS NOT NULL)) AS "vehicles",
            "json_agg"(DISTINCT "jsonb_build_object"('id', "w"."id", 'url', "w"."url", 'registration_date', "w"."registration_date", 'registrar', "w"."registrar", 'ip_address', "w"."ip_address")) FILTER (WHERE ("w"."id" IS NOT NULL)) AS "websites"
           FROM ((((((("public"."organizations" "o"
             LEFT JOIN "public"."physical_addresses" "poa" ON (("poa"."organization_id" = "o"."id")))
             LEFT JOIN "public"."phones" "op" ON (("op"."organization_id" = "o"."id")))
             LEFT JOIN "public"."emails" "e_1" ON (("e_1"."organization_id" = "o"."id")))
             LEFT JOIN "public"."social_accounts" "s" ON (("s"."organization_id" = "o"."id")))
             LEFT JOIN "public"."ip_addresses" "ip" ON (("ip"."organization_id" = "o"."id")))
             LEFT JOIN "public"."vehicles" "v" ON (("v"."organization_id" = "o"."id")))
             LEFT JOIN "public"."websites" "w" ON (("w"."organization_id" = "o"."id")))
          GROUP BY "o"."id"
        ), "individual_nodes" AS (
         SELECT "id"."sketch_id",
            "jsonb_build_object"('id', ("id"."id")::"text", 'type', 'custom', 'data', "jsonb_build_object"('id', "id"."id", 'full_name', "id"."full_name", 'label', "id"."full_name", 'type', 'individual'), 'position', "jsonb_build_object"('x', 0, 'y', 100)) AS "node"
           FROM "individual_data" "id"
        UNION ALL
         SELECT "id"."sketch_id",
            "jsonb_build_object"('id', ("e_1"."value" ->> 'id'::"text"), 'type', 'custom', 'data', "jsonb_build_object"('id', ("e_1"."value" ->> 'id'::"text"), 'email', ("e_1"."value" ->> 'email'::"text"), 'label', ("e_1"."value" ->> 'email'::"text"), 'type', 'email'), 'position', "jsonb_build_object"('x', 100, 'y', 100)) AS "node"
           FROM "individual_data" "id",
            LATERAL "json_array_elements"("id"."emails") "e_1"("value")
          WHERE (("e_1"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "id"."sketch_id",
            "jsonb_build_object"('id', ("p"."value" ->> 'id'::"text"), 'type', 'custom', 'data', "jsonb_build_object"('id', ("p"."value" ->> 'id'::"text"), 'phone_number', ("p"."value" ->> 'phone_number'::"text"), 'label', ("p"."value" ->> 'phone_number'::"text"), 'type', 'phone'), 'position', "jsonb_build_object"('x', '-100'::integer, 'y', 100)) AS "node"
           FROM "individual_data" "id",
            LATERAL "json_array_elements"("id"."phones") "p"("value")
          WHERE (("p"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "id"."sketch_id",
            "jsonb_build_object"('id', ("s"."value" ->> 'id'::"text"), 'type', 'custom', 'data', "jsonb_build_object"('id', ("s"."value" ->> 'id'::"text"), 'platform', ("s"."value" ->> 'platform'::"text"), 'username', ("s"."value" ->> 'username'::"text"), 'label', "concat"(("s"."value" ->> 'platform'::"text"), ': ', ("s"."value" ->> 'username'::"text")), 'type', 'social'), 'position', "jsonb_build_object"('x', 100, 'y', '-100'::integer)) AS "node"
           FROM "individual_data" "id",
            LATERAL "json_array_elements"("id"."social_accounts") "s"("value")
          WHERE (("s"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "id"."sketch_id",
            "jsonb_build_object"('id', ("ip"."value" ->> 'id'::"text"), 'type', 'custom', 'data', "jsonb_build_object"('id', ("ip"."value" ->> 'id'::"text"), 'ip_address', ("ip"."value" ->> 'ip_address'::"text"), 'label', ("ip"."value" ->> 'ip_address'::"text"), 'type', 'ip'), 'position', "jsonb_build_object"('x', '-100'::integer, 'y', '-100'::integer)) AS "node"
           FROM "individual_data" "id",
            LATERAL "json_array_elements"("id"."ip_addresses") "ip"("value")
          WHERE (("ip"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "id"."sketch_id",
            "jsonb_build_object"('id', ("v"."value" ->> 'id'::"text"), 'type', 'custom', 'data', "jsonb_build_object"('id', ("v"."value" ->> 'id'::"text"), 'plate', ("v"."value" ->> 'plate'::"text"), 'brand', ("v"."value" ->> 'brand'::"text"), 'model', ("v"."value" ->> 'model'::"text"), 'label', "concat"(("v"."value" ->> 'brand'::"text"), ' ', ("v"."value" ->> 'model'::"text"), ': ', ("v"."value" ->> 'plate'::"text")), 'type', 'vehicle'), 'position', "jsonb_build_object"('x', '-100'::integer, 'y', '-100'::integer)) AS "node"
           FROM "individual_data" "id",
            LATERAL "json_array_elements"("id"."vehicles") "v"("value")
          WHERE (("v"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "id"."sketch_id",
            "jsonb_build_object"('id', ("pa"."value" ->> 'id'::"text"), 'type', 'custom', 'data', "jsonb_build_object"('id', ("pa"."value" ->> 'id'::"text"), 'address', ("pa"."value" ->> 'address'::"text"), 'city', ("pa"."value" ->> 'city'::"text"), 'country', ("pa"."value" ->> 'country'::"text"), 'label', "concat"(("pa"."value" ->> 'address'::"text"), ', ', ("pa"."value" ->> 'city'::"text"), ', ', ("pa"."value" ->> 'country'::"text")), 'type', 'address'), 'position', "jsonb_build_object"('x', 100, 'y', 100)) AS "node"
           FROM "individual_data" "id",
            LATERAL "json_array_elements"("id"."physical_addresses") "pa"("value")
          WHERE (("pa"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "id"."sketch_id",
            "jsonb_build_object"('id', ("w"."value" ->> 'id'::"text"), 'type', 'custom', 'data', "jsonb_build_object"('id', ("w"."value" ->> 'id'::"text"), 'url', ("w"."value" ->> 'url'::"text"), 'registration_date', ("w"."value" ->> 'registration_date'::"text"), 'registrar', ("w"."value" ->> 'registrar'::"text"), 'ip_address', ("w"."value" ->> 'ip_address'::"text"), 'label', ("w"."value" ->> 'url'::"text"), 'type', 'website'), 'position', "jsonb_build_object"('x', 200, 'y', '-50'::integer)) AS "node"
           FROM "individual_data" "id",
            LATERAL "json_array_elements"("id"."websites") "w"("value")
          WHERE (("w"."value" ->> 'id'::"text") IS NOT NULL)
        ), "organization_nodes" AS (
         SELECT "od"."sketch_id",
            "jsonb_build_object"('id', ("od"."id")::"text", 'type', 'custom', 'data', "jsonb_build_object"('id', "od"."id", 'name', "od"."name", 'registration_number', "od"."registration_number", 'founding_date', "od"."founding_date", 'label', "od"."name", 'type', 'organization'), 'position', "jsonb_build_object"('x', 200, 'y', 0)) AS "node"
           FROM "organization_data" "od"
        UNION ALL
         SELECT "od"."sketch_id",
            "jsonb_build_object"('id', ("a"."value" ->> 'id'::"text"), 'type', 'custom', 'data', "jsonb_build_object"('id', ("a"."value" ->> 'id'::"text"), 'address', ("a"."value" ->> 'address'::"text"), 'city', ("a"."value" ->> 'city'::"text"), 'country', ("a"."value" ->> 'country'::"text"), 'label', "concat"(("a"."value" ->> 'address'::"text"), ', ', ("a"."value" ->> 'city'::"text"), ', ', ("a"."value" ->> 'country'::"text")), 'type', 'address'), 'position', "jsonb_build_object"('x', 100, 'y', 100)) AS "node"
           FROM "organization_data" "od",
            LATERAL "json_array_elements"("od"."addresses") "a"("value")
          WHERE (("a"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "od"."sketch_id",
            "jsonb_build_object"('id', ("p"."value" ->> 'id'::"text"), 'type', 'custom', 'data', "jsonb_build_object"('id', ("p"."value" ->> 'id'::"text"), 'phone_number', ("p"."value" ->> 'phone_number'::"text"), 'label', ("p"."value" ->> 'phone_number'::"text"), 'type', 'phone'), 'position', "jsonb_build_object"('x', '-100'::integer, 'y', 100)) AS "node"
           FROM "organization_data" "od",
            LATERAL "json_array_elements"("od"."phones") "p"("value")
          WHERE (("p"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "od"."sketch_id",
            "jsonb_build_object"('id', ("e_1"."value" ->> 'id'::"text"), 'type', 'custom', 'data', "jsonb_build_object"('id', ("e_1"."value" ->> 'id'::"text"), 'email', ("e_1"."value" ->> 'email'::"text"), 'label', ("e_1"."value" ->> 'email'::"text"), 'type', 'email'), 'position', "jsonb_build_object"('x', 100, 'y', 100)) AS "node"
           FROM "organization_data" "od",
            LATERAL "json_array_elements"("od"."emails") "e_1"("value")
          WHERE (("e_1"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "od"."sketch_id",
            "jsonb_build_object"('id', ("s"."value" ->> 'id'::"text"), 'type', 'custom', 'data', "jsonb_build_object"('id', ("s"."value" ->> 'id'::"text"), 'platform', ("s"."value" ->> 'platform'::"text"), 'username', ("s"."value" ->> 'username'::"text"), 'label', "concat"(("s"."value" ->> 'platform'::"text"), ': ', ("s"."value" ->> 'username'::"text")), 'type', 'social'), 'position', "jsonb_build_object"('x', 100, 'y', '-100'::integer)) AS "node"
           FROM "organization_data" "od",
            LATERAL "json_array_elements"("od"."social_accounts") "s"("value")
          WHERE (("s"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "od"."sketch_id",
            "jsonb_build_object"('id', ("ip"."value" ->> 'id'::"text"), 'type', 'custom', 'data', "jsonb_build_object"('id', ("ip"."value" ->> 'id'::"text"), 'ip_address', ("ip"."value" ->> 'ip_address'::"text"), 'label', ("ip"."value" ->> 'ip_address'::"text"), 'type', 'ip'), 'position', "jsonb_build_object"('x', '-100'::integer, 'y', '-100'::integer)) AS "node"
           FROM "organization_data" "od",
            LATERAL "json_array_elements"("od"."ip_addresses") "ip"("value")
          WHERE (("ip"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "od"."sketch_id",
            "jsonb_build_object"('id', ("v"."value" ->> 'id'::"text"), 'type', 'custom', 'data', "jsonb_build_object"('id', ("v"."value" ->> 'id'::"text"), 'plate', ("v"."value" ->> 'plate'::"text"), 'brand', ("v"."value" ->> 'brand'::"text"), 'model', ("v"."value" ->> 'model'::"text"), 'label', "concat"(("v"."value" ->> 'brand'::"text"), ' ', ("v"."value" ->> 'model'::"text"), ': ', ("v"."value" ->> 'plate'::"text")), 'type', 'vehicle'), 'position', "jsonb_build_object"('x', '-100'::integer, 'y', '-100'::integer)) AS "node"
           FROM "organization_data" "od",
            LATERAL "json_array_elements"("od"."vehicles") "v"("value")
          WHERE (("v"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "od"."sketch_id",
            "jsonb_build_object"('id', ("w"."value" ->> 'id'::"text"), 'type', 'custom', 'data', "jsonb_build_object"('id', ("w"."value" ->> 'id'::"text"), 'url', ("w"."value" ->> 'url'::"text"), 'registration_date', ("w"."value" ->> 'registration_date'::"text"), 'registrar', ("w"."value" ->> 'registrar'::"text"), 'ip_address', ("w"."value" ->> 'ip_address'::"text"), 'label', ("w"."value" ->> 'url'::"text"), 'type', 'website'), 'position', "jsonb_build_object"('x', 200, 'y', '-50'::integer)) AS "node"
           FROM "organization_data" "od",
            LATERAL "json_array_elements"("od"."websites") "w"("value")
          WHERE (("w"."value" ->> 'id'::"text") IS NOT NULL)
        ), "individual_edges" AS (
         SELECT "id"."sketch_id",
            "jsonb_build_object"('id', "concat"("id"."id", '-', ("e_1"."value" ->> 'id'::"text")), 'source', ("id"."id")::"text", 'target', ("e_1"."value" ->> 'id'::"text"), 'type', 'custom', 'label', 'email') AS "edge"
           FROM "individual_data" "id",
            LATERAL "json_array_elements"("id"."emails") "e_1"("value")
          WHERE (("e_1"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "id"."sketch_id",
            "jsonb_build_object"('id', "concat"("id"."id", '-', ("p"."value" ->> 'id'::"text")), 'source', ("id"."id")::"text", 'target', ("p"."value" ->> 'id'::"text"), 'type', 'custom', 'label', 'phone') AS "edge"
           FROM "individual_data" "id",
            LATERAL "json_array_elements"("id"."phones") "p"("value")
          WHERE (("p"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "id"."sketch_id",
            "jsonb_build_object"('id', "concat"("id"."id", '-', ("s"."value" ->> 'id'::"text")), 'source', ("id"."id")::"text", 'target', ("s"."value" ->> 'id'::"text"), 'type', 'custom', 'label', 'social') AS "edge"
           FROM "individual_data" "id",
            LATERAL "json_array_elements"("id"."social_accounts") "s"("value")
          WHERE (("s"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "id"."sketch_id",
            "jsonb_build_object"('id', "concat"("id"."id", '-', ("ip"."value" ->> 'id'::"text")), 'source', ("id"."id")::"text", 'target', ("ip"."value" ->> 'id'::"text"), 'type', 'custom', 'label', 'IP') AS "edge"
           FROM "individual_data" "id",
            LATERAL "json_array_elements"("id"."ip_addresses") "ip"("value")
          WHERE (("ip"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "id"."sketch_id",
            "jsonb_build_object"('id', "concat"("id"."id", '-', ("v"."value" ->> 'id'::"text")), 'source', ("id"."id")::"text", 'target', ("v"."value" ->> 'id'::"text"), 'type', 'custom', 'label', ("v"."value" ->> 'type'::"text")) AS "edge"
           FROM "individual_data" "id",
            LATERAL "json_array_elements"("id"."vehicles") "v"("value")
          WHERE (("v"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "id"."sketch_id",
            "jsonb_build_object"('id', "concat"("id"."id", '-', ("pa"."value" ->> 'id'::"text")), 'source', ("id"."id")::"text", 'target', ("pa"."value" ->> 'id'::"text"), 'type', 'custom', 'label', 'address') AS "edge"
           FROM "individual_data" "id",
            LATERAL "json_array_elements"("id"."physical_addresses") "pa"("value")
          WHERE (("pa"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "id"."sketch_id",
            "jsonb_build_object"('id', "concat"("id"."id", '-', ("w"."value" ->> 'id'::"text")), 'source', ("id"."id")::"text", 'target', ("w"."value" ->> 'id'::"text"), 'type', 'custom', 'label', 'website') AS "edge"
           FROM "individual_data" "id",
            LATERAL "json_array_elements"("id"."websites") "w"("value")
          WHERE (("w"."value" ->> 'id'::"text") IS NOT NULL)
        ), "organization_edges" AS (
         SELECT "od"."sketch_id",
            "jsonb_build_object"('id', "concat"("od"."id", '-', ("a"."value" ->> 'id'::"text")), 'source', ("od"."id")::"text", 'target', ("a"."value" ->> 'id'::"text"), 'type', 'custom', 'label', 'address') AS "edge"
           FROM "organization_data" "od",
            LATERAL "json_array_elements"("od"."addresses") "a"("value")
          WHERE (("a"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "od"."sketch_id",
            "jsonb_build_object"('id', "concat"("od"."id", '-', ("p"."value" ->> 'id'::"text")), 'source', ("od"."id")::"text", 'target', ("p"."value" ->> 'id'::"text"), 'type', 'custom', 'label', 'phone') AS "edge"
           FROM "organization_data" "od",
            LATERAL "json_array_elements"("od"."phones") "p"("value")
          WHERE (("p"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "od"."sketch_id",
            "jsonb_build_object"('id', "concat"("od"."id", '-', ("e_1"."value" ->> 'id'::"text")), 'source', ("od"."id")::"text", 'target', ("e_1"."value" ->> 'id'::"text"), 'type', 'custom', 'label', 'email') AS "edge"
           FROM "organization_data" "od",
            LATERAL "json_array_elements"("od"."emails") "e_1"("value")
          WHERE (("e_1"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "od"."sketch_id",
            "jsonb_build_object"('id', "concat"("od"."id", '-', ("s"."value" ->> 'id'::"text")), 'source', ("od"."id")::"text", 'target', ("s"."value" ->> 'id'::"text"), 'type', 'custom', 'label', 'social') AS "edge"
           FROM "organization_data" "od",
            LATERAL "json_array_elements"("od"."social_accounts") "s"("value")
          WHERE (("s"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "od"."sketch_id",
            "jsonb_build_object"('id', "concat"("od"."id", '-', ("ip"."value" ->> 'id'::"text")), 'source', ("od"."id")::"text", 'target', ("ip"."value" ->> 'id'::"text"), 'type', 'custom', 'label', 'IP') AS "edge"
           FROM "organization_data" "od",
            LATERAL "json_array_elements"("od"."ip_addresses") "ip"("value")
          WHERE (("ip"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "od"."sketch_id",
            "jsonb_build_object"('id', "concat"("od"."id", '-', ("v"."value" ->> 'id'::"text")), 'source', ("od"."id")::"text", 'target', ("v"."value" ->> 'id'::"text"), 'type', 'custom', 'label', ("v"."value" ->> 'type'::"text")) AS "edge"
           FROM "organization_data" "od",
            LATERAL "json_array_elements"("od"."vehicles") "v"("value")
          WHERE (("v"."value" ->> 'id'::"text") IS NOT NULL)
        UNION ALL
         SELECT "od"."sketch_id",
            "jsonb_build_object"('id', "concat"("od"."id", '-', ("w"."value" ->> 'id'::"text")), 'source', ("od"."id")::"text", 'target', ("w"."value" ->> 'id'::"text"), 'type', 'custom', 'label', 'website') AS "edge"
           FROM "organization_data" "od",
            LATERAL "json_array_elements"("od"."websites") "w"("value")
          WHERE (("w"."value" ->> 'id'::"text") IS NOT NULL)
        ), "debug_relationships" AS (
         SELECT "individuals_individuals"."sketch_id",
            "count"(*) AS "relationship_count"
           FROM "public"."individuals_individuals"
          GROUP BY "individuals_individuals"."sketch_id"
        ), "relationship_edges" AS (
         SELECT "r"."sketch_id",
            "jsonb_build_object"('id', ("r"."id")::"text", 'source', ("r"."individual_a")::"text", 'target', ("r"."individual_b")::"text", 'type', 'custom', 'label', COALESCE("r"."relation_type", 'related'::"text"), 'data', "jsonb_build_object"('confidence_level', "r"."confidence_level", 'relation_type', "r"."relation_type")) AS "edge"
           FROM "public"."individuals_individuals" "r"
          WHERE (("r"."individual_a" IS NOT NULL) AND ("r"."individual_b" IS NOT NULL))
        ), "orgs_individuals_edges" AS (
         SELECT "r"."sketch_id",
            "jsonb_build_object"('id', ("r"."id")::"text", 'source', ("r"."organization_id")::"text", 'target', ("r"."individual_id")::"text", 'type', 'custom', 'label', COALESCE("r"."relation_type", 'employee'::"text"), 'data', "jsonb_build_object"('relation_type', "r"."relation_type")) AS "edge"
           FROM "public"."organizations_individuals" "r"
          WHERE (("r"."organization_id" IS NOT NULL) AND ("r"."individual_id" IS NOT NULL))
        ), "orgs_organizations_edges" AS (
         SELECT "oo"."sketch_id",
            "jsonb_build_object"('id', ("oo"."id")::"text", 'source', ("oo"."organization_a")::"text", 'target', ("oo"."organization_b")::"text", 'type', 'custom', 'label', COALESCE("oo"."relation_type", 'related'::"text"), 'data', "jsonb_build_object"('relation_type', "oo"."relation_type")) AS "edge"
           FROM "public"."organizations_organizations" "oo"
          WHERE (("oo"."organization_a" IS NOT NULL) AND ("oo"."organization_b" IS NOT NULL))
        ), "nodes_by_investigation" AS (
         SELECT "all_nodes"."sketch_id",
            "json_agg"("all_nodes"."node") AS "nodes"
           FROM ( SELECT "individual_nodes"."sketch_id",
                    "individual_nodes"."node"
                   FROM "individual_nodes"
                UNION ALL
                 SELECT "organization_nodes"."sketch_id",
                    "organization_nodes"."node"
                   FROM "organization_nodes") "all_nodes"
          GROUP BY "all_nodes"."sketch_id"
        ), "edges_by_investigation" AS (
         SELECT "all_edges"."sketch_id",
            "json_agg"("all_edges"."edge") AS "edges"
           FROM ( SELECT "individual_edges"."sketch_id",
                    "individual_edges"."edge"
                   FROM "individual_edges"
                UNION ALL
                 SELECT "organization_edges"."sketch_id",
                    "organization_edges"."edge"
                   FROM "organization_edges"
                UNION ALL
                 SELECT "relationship_edges"."sketch_id",
                    "relationship_edges"."edge"
                   FROM "relationship_edges"
                UNION ALL
                 SELECT "orgs_individuals_edges"."sketch_id",
                    "orgs_individuals_edges"."edge"
                   FROM "orgs_individuals_edges"
                UNION ALL
                 SELECT "orgs_organizations_edges"."sketch_id",
                    "orgs_organizations_edges"."edge"
                   FROM "orgs_organizations_edges") "all_edges"
          GROUP BY "all_edges"."sketch_id"
        )
 SELECT "inv"."id" AS "sketch_id",
    COALESCE("n"."nodes", '[]'::"json") AS "nodes",
    COALESCE("e"."edges", '[]'::"json") AS "edges",
    "dr"."relationship_count" AS "debug_relationship_count"
   FROM ((("public"."sketches" "inv"
     LEFT JOIN "nodes_by_investigation" "n" ON (("n"."sketch_id" = "inv"."id")))
     LEFT JOIN "edges_by_investigation" "e" ON (("e"."sketch_id" = "inv"."id")))
     LEFT JOIN "debug_relationships" "dr" ON (("dr"."sketch_id" = "inv"."id")));



CREATE OR REPLACE TRIGGER "on_investigation_insert" AFTER INSERT ON "public"."investigations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_investigation"();



CREATE OR REPLACE TRIGGER "on_sketch_insert" AFTER INSERT ON "public"."sketches" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_sketch"();



CREATE OR REPLACE TRIGGER "trg_sync_investigation_profile" AFTER INSERT ON "public"."sketches_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_investigation_profile_from_sketch"();



CREATE OR REPLACE TRIGGER "trigger_update_project_last_updated_emails" AFTER INSERT OR DELETE OR UPDATE ON "public"."emails" FOR EACH ROW EXECUTE FUNCTION "public"."update_investigation_last_updated"();



CREATE OR REPLACE TRIGGER "trigger_update_project_last_updated_individuals" AFTER INSERT OR DELETE OR UPDATE ON "public"."individuals" FOR EACH ROW EXECUTE FUNCTION "public"."update_investigation_last_updated"();



CREATE OR REPLACE TRIGGER "trigger_update_project_last_updated_ip_addresses" AFTER INSERT OR DELETE OR UPDATE ON "public"."ip_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."update_investigation_last_updated"();



CREATE OR REPLACE TRIGGER "trigger_update_project_last_updated_phones" AFTER INSERT OR DELETE OR UPDATE ON "public"."phones" FOR EACH ROW EXECUTE FUNCTION "public"."update_investigation_last_updated"();



CREATE OR REPLACE TRIGGER "trigger_update_project_last_updated_physical_addresses" AFTER INSERT OR DELETE OR UPDATE ON "public"."physical_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."update_investigation_last_updated"();



CREATE OR REPLACE TRIGGER "trigger_update_project_last_updated_relationships" AFTER INSERT OR DELETE OR UPDATE ON "public"."individuals_individuals" FOR EACH ROW EXECUTE FUNCTION "public"."update_investigation_last_updated"();



CREATE OR REPLACE TRIGGER "trigger_update_project_last_updated_social_accounts" AFTER INSERT OR DELETE OR UPDATE ON "public"."social_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_investigation_last_updated"();



CREATE OR REPLACE TRIGGER "update_investigation_last_updated" AFTER UPDATE ON "public"."sketches" FOR EACH ROW EXECUTE FUNCTION "public"."update_sketch_last_updated"();



CREATE OR REPLACE TRIGGER "update_last_updated_at_trigger" AFTER UPDATE ON "public"."sketches" FOR EACH ROW EXECUTE FUNCTION "public"."update_last_updated_at"();



ALTER TABLE ONLY "public"."accounts_breaches"
    ADD CONSTRAINT "accounts_breaches_breach_id_fkey" FOREIGN KEY ("breach_id") REFERENCES "public"."breaches"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "public"."individuals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_sketch_id_fkey" FOREIGN KEY ("sketch_id") REFERENCES "public"."sketches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedbacks"
    ADD CONSTRAINT "feedbacks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_sketch_id_fkey" FOREIGN KEY ("sketch_id") REFERENCES "public"."sketches"("id");



ALTER TABLE ONLY "public"."individuals"
    ADD CONSTRAINT "individuals_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."individuals"
    ADD CONSTRAINT "individuals_sketch_id_fkey" FOREIGN KEY ("sketch_id") REFERENCES "public"."sketches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investigations"
    ADD CONSTRAINT "investigations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sketches_profiles"
    ADD CONSTRAINT "investigations_profiles_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sketches"
    ADD CONSTRAINT "investigations_project_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ip_addresses"
    ADD CONSTRAINT "ip_addresses_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "public"."individuals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ip_addresses"
    ADD CONSTRAINT "ip_addresses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ip_addresses"
    ADD CONSTRAINT "ip_addresses_sketch_id_fkey" FOREIGN KEY ("sketch_id") REFERENCES "public"."sketches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations_individuals"
    ADD CONSTRAINT "organizations_individuals_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "public"."individuals"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations_individuals"
    ADD CONSTRAINT "organizations_individuals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations_individuals"
    ADD CONSTRAINT "organizations_individuals_sketch_id_fkey" FOREIGN KEY ("sketch_id") REFERENCES "public"."sketches"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations_organizations"
    ADD CONSTRAINT "organizations_organizations_organization_a_fkey" FOREIGN KEY ("organization_a") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations_organizations"
    ADD CONSTRAINT "organizations_organizations_organization_b_fkey" FOREIGN KEY ("organization_b") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations_organizations"
    ADD CONSTRAINT "organizations_organizations_sketch_id_fkey" FOREIGN KEY ("sketch_id") REFERENCES "public"."sketches"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_sketch_id_fkey" FOREIGN KEY ("sketch_id") REFERENCES "public"."sketches"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."phones"
    ADD CONSTRAINT "phones_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "public"."individuals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."phones"
    ADD CONSTRAINT "phones_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."phones"
    ADD CONSTRAINT "phones_sketch_id_fkey" FOREIGN KEY ("sketch_id") REFERENCES "public"."sketches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."physical_addresses"
    ADD CONSTRAINT "physical_addresses_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "public"."individuals"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."physical_addresses"
    ADD CONSTRAINT "physical_addresses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."physical_addresses"
    ADD CONSTRAINT "physical_addresses_sketch_id_fkey" FOREIGN KEY ("sketch_id") REFERENCES "public"."sketches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investigations_profiles"
    ADD CONSTRAINT "projects_profiles_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investigations_profiles"
    ADD CONSTRAINT "projects_profiles_project_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."individuals_individuals"
    ADD CONSTRAINT "relationships_individual_a_fkey" FOREIGN KEY ("individual_a") REFERENCES "public"."individuals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."individuals_individuals"
    ADD CONSTRAINT "relationships_individual_b_fkey" FOREIGN KEY ("individual_b") REFERENCES "public"."individuals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."individuals_individuals"
    ADD CONSTRAINT "relationships_sketch_id_fkey" FOREIGN KEY ("sketch_id") REFERENCES "public"."sketches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_sketch_id_fkey" FOREIGN KEY ("sketch_id") REFERENCES "public"."sketches"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sketches"
    ADD CONSTRAINT "sketches_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sketches_profiles"
    ADD CONSTRAINT "sketches_profiles_sketch_id_fkey" FOREIGN KEY ("sketch_id") REFERENCES "public"."sketches"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."social_accounts"
    ADD CONSTRAINT "social_accounts_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "public"."individuals"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."social_accounts"
    ADD CONSTRAINT "social_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."social_accounts"
    ADD CONSTRAINT "social_accounts_sketch_id_fkey" FOREIGN KEY ("sketch_id") REFERENCES "public"."sketches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "public"."individuals"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_sketch_id_fkey" FOREIGN KEY ("sketch_id") REFERENCES "public"."sketches"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "public"."individuals"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_sketch_id_fkey" FOREIGN KEY ("sketch_id") REFERENCES "public"."sketches"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Can create sketches in investigations you are part of" ON "public"."sketches" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."investigation_id" = "sketches"."investigation_id") AND ("ip"."profile_id" = "auth"."uid"())))) OR ("auth"."uid"() = "owner_id")));



CREATE POLICY "Can delete emails if you have access to the sketch" ON "public"."emails" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "emails"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can delete individuals if you have access to the sketch" ON "public"."individuals" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "individuals"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can delete individuals_individuals if you have access to the sk" ON "public"."individuals_individuals" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "individuals_individuals"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can delete ip_addresses if you have access to the sketch" ON "public"."ip_addresses" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "ip_addresses"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can delete organizations if you have access to the sketch" ON "public"."organizations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "organizations"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can delete organizations_individuals if you have access to the " ON "public"."organizations_individuals" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "organizations_individuals"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can delete organizations_organizations if you have access to th" ON "public"."organizations_organizations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "organizations_organizations"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can delete phones if you have access to the sketch" ON "public"."phones" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "phones"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can delete scans if you have access to the sketch" ON "public"."scans" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "scans"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can delete social_accounts if you have access to the sketch" ON "public"."social_accounts" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "social_accounts"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can delete vehicles if you have access to the sketch" ON "public"."vehicles" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "vehicles"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can delete websites if you have access to the sketch" ON "public"."websites" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "websites"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can insert emails if you have access to the sketch" ON "public"."emails" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "emails"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can insert individuals if you have access to the sketch" ON "public"."individuals" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "individuals"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can insert individuals_individuals if you have access to the sk" ON "public"."individuals_individuals" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "individuals_individuals"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can insert ip_addresses if you have access to the sketch" ON "public"."ip_addresses" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "ip_addresses"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can insert organizations if you have access to the sketch" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "organizations"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can insert organizations_individuals if you have access to the " ON "public"."organizations_individuals" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "organizations_individuals"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can insert organizations_organizations if you have access to th" ON "public"."organizations_organizations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "organizations_organizations"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can insert phones if you have access to the sketch" ON "public"."phones" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "phones"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can insert scans if you have access to the sketch" ON "public"."scans" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "scans"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can insert social_accounts if you have access to the sketch" ON "public"."social_accounts" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "social_accounts"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can insert vehicles if you have access to the sketch" ON "public"."vehicles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "vehicles"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can insert websites if you have access to the sketch" ON "public"."websites" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "websites"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can read all profiles in investigations you are part of" ON "public"."investigations_profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Can read all sketches in investigations you are part of" ON "public"."sketches" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "ip"
  WHERE ((("ip"."sketch_id" = "sketches"."id") AND ("ip"."profile_id" = "auth"."uid"())) OR ("sketches"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Can read emails if you have access to the sketch" ON "public"."emails" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "emails"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can read individuals if you have access to the sketch" ON "public"."individuals" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "individuals"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can read individuals_individuals if you have access to the sket" ON "public"."individuals_individuals" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "individuals_individuals"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can read ip_addresses if you have access to the sketch" ON "public"."ip_addresses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "ip_addresses"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can read organizations if you have access to the sketch" ON "public"."organizations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "organizations"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can read organizations_individuals if you have access to the sk" ON "public"."organizations_individuals" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "organizations_individuals"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can read organizations_organizations if you have access to the " ON "public"."organizations_organizations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "organizations_organizations"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can read phones if you have access to the sketch" ON "public"."phones" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "phones"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can read profiles in sketches if you have access to the investi" ON "public"."sketches_profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Can read scans if you have access to the sketch" ON "public"."scans" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "scans"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can read social_accounts if you have access to the sketch" ON "public"."social_accounts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "social_accounts"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can read vehicles if you have access to the sketch" ON "public"."vehicles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "vehicles"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can read websites if you have access to the sketch" ON "public"."websites" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "websites"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can update emails if you have access to the sketch" ON "public"."emails" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "emails"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can update individuals if you have access to the sketch" ON "public"."individuals" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "individuals"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can update individuals_individuals if you have access to the sk" ON "public"."individuals_individuals" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "individuals_individuals"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can update ip_addresses if you have access to the sketch" ON "public"."ip_addresses" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "ip_addresses"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can update organizations if you have access to the sketch" ON "public"."organizations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "organizations"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can update organizations_individuals if you have access to the " ON "public"."organizations_individuals" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "organizations_individuals"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can update organizations_organizations if you have access to th" ON "public"."organizations_organizations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "organizations_organizations"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can update phones if you have access to the sketch" ON "public"."phones" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "phones"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can update scans if you have access to the sketch" ON "public"."scans" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "scans"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can update social_accounts if you have access to the sketch" ON "public"."social_accounts" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "social_accounts"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can update vehicles if you have access to the sketch" ON "public"."vehicles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "vehicles"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Can update websites if you have access to the sketch" ON "public"."websites" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "sp"
  WHERE (("sp"."sketch_id" = "websites"."sketch_id") AND ("sp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Members can edit their own sketch profile" ON "public"."sketches_profiles" FOR UPDATE TO "authenticated" USING (("profile_id" = "auth"."uid"()));



CREATE POLICY "Members can update own investigations" ON "public"."investigations" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "owner_id") OR (EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."investigation_id" = "investigations"."id") AND ("ip"."profile_id" = "auth"."uid"()))))));



CREATE POLICY "Members of investigations_profiles can read investigation" ON "public"."investigations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."investigation_id" = "investigations"."id") AND ("ip"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Only investigation owner can add members" ON "public"."investigations_profiles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."investigations"
  WHERE (("investigations"."id" = "investigations_profiles"."investigation_id") AND ("investigations"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Only investigation owner can delete profiles" ON "public"."investigations_profiles" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations"
  WHERE (("investigations"."id" = "investigations_profiles"."investigation_id") AND ("investigations"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Only investigation owner can update profiles" ON "public"."investigations_profiles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations"
  WHERE (("investigations"."id" = "investigations_profiles"."investigation_id") AND ("investigations"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Only owner can add profiles to sketches" ON "public"."sketches_profiles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sketches" "s"
  WHERE ("s"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Only owner can delete profiles from sketches" ON "public"."sketches_profiles" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sketches" "s"
  WHERE (("s"."id" = "sketches_profiles"."sketch_id") AND ("s"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Only owner or sketch creator can delete their sketch" ON "public"."sketches" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."investigations" "i"
  WHERE (("i"."id" = "sketches"."investigation_id") AND ("i"."owner_id" = "auth"."uid"())))) OR ("owner_id" = "auth"."uid"())));



CREATE POLICY "Owner can delete own investigations" ON "public"."investigations" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Owner can read own investigations" ON "public"."investigations" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Sketch members can update their sketch" ON "public"."sketches" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."sketches_profiles" "i"
  WHERE (("i"."sketch_id" = "sketches"."id") AND ("i"."profile_id" = "auth"."uid"())))) OR ("auth"."uid"() = "owner_id")));



CREATE POLICY "Users can delete their own profiles" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own investigations" ON "public"."investigations" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can insert their own profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can update their own profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."accounts_breaches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."breaches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedbacks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."individuals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."individuals_individuals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."investigations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."investigations_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ip_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations_individuals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations_organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."phones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."physical_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sketches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sketches_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vehicles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."websites" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."scans";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."sketches";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."handle_new_investigation"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_investigation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_investigation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_project"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_project"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_project"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_sketch"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_sketch"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_sketch"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_investigation_profile_from_sketch"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_investigation_profile_from_sketch"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_investigation_profile_from_sketch"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_investigation_last_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_investigation_last_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_investigation_last_updated"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_last_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_last_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_last_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_sketch_last_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_sketch_last_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_sketch_last_updated"() TO "service_role";


















GRANT ALL ON TABLE "public"."accounts_breaches" TO "anon";
GRANT ALL ON TABLE "public"."accounts_breaches" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts_breaches" TO "service_role";



GRANT ALL ON SEQUENCE "public"."accounts_breaches_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."accounts_breaches_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."accounts_breaches_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."breaches" TO "anon";
GRANT ALL ON TABLE "public"."breaches" TO "authenticated";
GRANT ALL ON TABLE "public"."breaches" TO "service_role";



GRANT ALL ON SEQUENCE "public"."breaches_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."breaches_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."breaches_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."emails" TO "anon";
GRANT ALL ON TABLE "public"."emails" TO "authenticated";
GRANT ALL ON TABLE "public"."emails" TO "service_role";



GRANT ALL ON TABLE "public"."feedbacks" TO "anon";
GRANT ALL ON TABLE "public"."feedbacks" TO "authenticated";
GRANT ALL ON TABLE "public"."feedbacks" TO "service_role";



GRANT ALL ON SEQUENCE "public"."feedbacks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."feedbacks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."feedbacks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."individuals" TO "anon";
GRANT ALL ON TABLE "public"."individuals" TO "authenticated";
GRANT ALL ON TABLE "public"."individuals" TO "service_role";



GRANT ALL ON TABLE "public"."individuals_individuals" TO "anon";
GRANT ALL ON TABLE "public"."individuals_individuals" TO "authenticated";
GRANT ALL ON TABLE "public"."individuals_individuals" TO "service_role";



GRANT ALL ON TABLE "public"."investigations" TO "anon";
GRANT ALL ON TABLE "public"."investigations" TO "authenticated";
GRANT ALL ON TABLE "public"."investigations" TO "service_role";



GRANT ALL ON TABLE "public"."investigations_profiles" TO "anon";
GRANT ALL ON TABLE "public"."investigations_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."investigations_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."sketches_profiles" TO "anon";
GRANT ALL ON TABLE "public"."sketches_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."sketches_profiles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."investigations_profiles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."investigations_profiles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."investigations_profiles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ip_addresses" TO "anon";
GRANT ALL ON TABLE "public"."ip_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."ip_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."organizations_individuals" TO "anon";
GRANT ALL ON TABLE "public"."organizations_individuals" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations_individuals" TO "service_role";



GRANT ALL ON TABLE "public"."organizations_organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations_organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations_organizations" TO "service_role";



GRANT ALL ON TABLE "public"."organization_graph" TO "anon";
GRANT ALL ON TABLE "public"."organization_graph" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_graph" TO "service_role";



GRANT ALL ON SEQUENCE "public"."organizations_organizations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."organizations_organizations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."organizations_organizations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."phones" TO "anon";
GRANT ALL ON TABLE "public"."phones" TO "authenticated";
GRANT ALL ON TABLE "public"."phones" TO "service_role";



GRANT ALL ON TABLE "public"."physical_addresses" TO "anon";
GRANT ALL ON TABLE "public"."physical_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."physical_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."projects_profiles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."projects_profiles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."projects_profiles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."scans" TO "anon";
GRANT ALL ON TABLE "public"."scans" TO "authenticated";
GRANT ALL ON TABLE "public"."scans" TO "service_role";



GRANT ALL ON TABLE "public"."sketch_graph" TO "anon";
GRANT ALL ON TABLE "public"."sketch_graph" TO "authenticated";
GRANT ALL ON TABLE "public"."sketch_graph" TO "service_role";



GRANT ALL ON TABLE "public"."social_accounts" TO "anon";
GRANT ALL ON TABLE "public"."social_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."social_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."vehicles" TO "anon";
GRANT ALL ON TABLE "public"."vehicles" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicles" TO "service_role";



GRANT ALL ON TABLE "public"."websites" TO "anon";
GRANT ALL ON TABLE "public"."websites" TO "authenticated";
GRANT ALL ON TABLE "public"."websites" TO "service_role";



GRANT ALL ON TABLE "public"."sketch_table" TO "anon";
GRANT ALL ON TABLE "public"."sketch_table" TO "authenticated";
GRANT ALL ON TABLE "public"."sketch_table" TO "service_role";



GRANT ALL ON TABLE "public"."sketches" TO "anon";
GRANT ALL ON TABLE "public"."sketches" TO "authenticated";
GRANT ALL ON TABLE "public"."sketches" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
