

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



CREATE OR REPLACE FUNCTION "public"."create_investigation_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO investigations_profiles (profile_id, investigation_id)
    VALUES ((SELECT auth.uid()), NEW.id); -- Use auth.uid() for the profile_id
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_investigation_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_investigation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Insère l'entrée dans investigations_profiles en associant l'investigation au créateur
  insert into investigations_profiles (investigation_id, profile_id)
  values (new.id, auth.uid());

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_investigation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_project"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Insère l'entrée dans projects_profiles en associant le projet au créateur
  insert into projects_profiles (project_id, profile_id)
  values (new.id, auth.uid());

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_project"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_project_folder"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Crée un "dossier" en ajoutant un `/`
  insert into storage.objects (bucket_id, name, owner)
  values ('documents', new.id || '/', auth.uid());

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_project_folder"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."update_last_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Si la mise à jour concerne 'investigations', mettre à jour 'projects' uniquement si 10s sont écoulées
    IF TG_TABLE_NAME = 'investigations' THEN
        IF OLD.last_updated_at IS NULL OR OLD.last_updated_at < NOW() - INTERVAL '10 seconds' THEN
            UPDATE projects
            SET last_updated_at = NOW()
            WHERE id = NEW.project_id;

            UPDATE investigations
            SET last_updated_at = NOW()
            WHERE id = NEW.id;
        END IF;

    -- Si la mise à jour concerne une table liée, mettre à jour 'investigations' et 'projects' seulement si 10s sont écoulées
    ELSIF TG_TABLE_NAME IN ('emails', 'individuals', 'relationships', 'physical_addresses', 'social_accounts', 'ip_addresses', 'phone_numbers') THEN
        IF (SELECT last_updated_at FROM investigations WHERE id = NEW.investigation_id) IS NULL OR 
           (SELECT last_updated_at FROM investigations WHERE id = NEW.investigation_id) < NOW() - INTERVAL '10 seconds' THEN
            UPDATE investigations
            SET last_updated_at = NOW()
            WHERE id = NEW.investigation_id;

            UPDATE projects
            SET last_updated_at = NOW()
            WHERE id = (
                SELECT project_id FROM investigations WHERE id = NEW.investigation_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_last_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_project_last_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Si la mise à jour concerne 'investigations', mettre à jour 'projects' uniquement si 10s sont écoulées
    IF TG_TABLE_NAME = 'investigations' THEN
        IF OLD.last_updated_at IS NULL OR OLD.last_updated_at < NOW() - INTERVAL '10 seconds' THEN
            UPDATE projects
            SET last_updated_at = NOW()
            WHERE id = NEW.project_id;
            UPDATE investigations
            SET last_updated_at = NOW()
            WHERE id = NEW.id;
        END IF;

    -- Si la mise à jour concerne une table liée, mettre à jour 'investigations' et 'projects' seulement si 10s sont écoulées
    ELSIF TG_TABLE_NAME IN ('emails', 'individuals', 'relationships', 'physical_addresses', 'social_accounts', 'ip_addresses', 'phone_numbers') THEN
        IF (SELECT last_updated_at FROM investigations WHERE id = NEW.investigation_id) < NOW() - INTERVAL '10 seconds' THEN
            UPDATE investigations
            SET last_updated_at = NOW()
            WHERE id = NEW.investigation_id;

            UPDATE projects
            SET last_updated_at = NOW()
            WHERE id = (
                SELECT project_id FROM investigations WHERE id = NEW.investigation_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_project_last_updated"() OWNER TO "postgres";

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
    "investigation_id" "uuid",
    "email" "text",
    "breach_found" boolean DEFAULT false
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
    "investigation_id" "uuid"
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."individuals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "investigation_id" "uuid",
    "full_name" "text",
    "birth_date" "date",
    "gender" "text",
    "nationality" "text",
    "notes" "jsonb",
    "image_url" "text",
    "group_id" "uuid"
);


ALTER TABLE "public"."individuals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investigations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text",
    "description" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "owner_id" "uuid" DEFAULT "auth"."uid"(),
    "status" "public"."investigation_status" DEFAULT 'active'::"public"."investigation_status",
    "project_id" "uuid" NOT NULL,
    "last_updated_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text")
);


ALTER TABLE "public"."investigations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investigations_profiles" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "profile_id" "uuid",
    "investigation_id" "uuid"
);


ALTER TABLE "public"."investigations_profiles" OWNER TO "postgres";


ALTER TABLE "public"."investigations_profiles" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
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
    "investigation_id" "uuid",
    "ip_address" "text",
    "geolocation" "jsonb",
    "last_seen" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."ip_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phone_numbers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "individual_id" "uuid",
    "investigation_id" "uuid",
    "phone_number" "text",
    "country" "text"
);


ALTER TABLE "public"."phone_numbers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."physical_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "address" "text",
    "city" "text",
    "country" "text",
    "zip" "text",
    "investigation_id" "uuid",
    "individual_id" "uuid"
);


ALTER TABLE "public"."physical_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "description" "text",
    "owner_id" "uuid" DEFAULT "auth"."uid"(),
    "last_updated_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text")
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects_profiles" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_id" "uuid",
    "profile_id" "uuid"
);


ALTER TABLE "public"."projects_profiles" OWNER TO "postgres";


ALTER TABLE "public"."projects_profiles" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."projects_profiles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."relationships" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "individual_a" "uuid",
    "individual_b" "uuid",
    "investigation_id" "uuid",
    "relation_type" "text",
    "confidence_level" integer,
    CONSTRAINT "relationships_confidence_level_check" CHECK ((("confidence_level" >= 1) AND ("confidence_level" <= 100)))
);


ALTER TABLE "public"."relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text",
    "scan_name" "text",
    "results" "jsonb",
    "value" "text",
    "investigation_id" "uuid"
);


ALTER TABLE "public"."scans" OWNER TO "postgres";


COMMENT ON COLUMN "public"."scans"."value" IS 'The value that was searched for. Can be a username, an email, an IP address, etc.';



CREATE TABLE IF NOT EXISTS "public"."social_accounts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "individual_id" "uuid",
    "investigation_id" "uuid",
    "platform" "text",
    "username" "text",
    "profile_url" "text",
    "last_seen" timestamp without time zone
);


ALTER TABLE "public"."social_accounts" OWNER TO "postgres";


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



ALTER TABLE ONLY "public"."investigations"
    ADD CONSTRAINT "investigations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investigations_profiles"
    ADD CONSTRAINT "investigations_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ip_addresses"
    ADD CONSTRAINT "ip_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_numbers"
    ADD CONSTRAINT "phone_numbers_phone_number_key" UNIQUE ("phone_number");



ALTER TABLE ONLY "public"."phone_numbers"
    ADD CONSTRAINT "phone_numbers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."physical_addresses"
    ADD CONSTRAINT "physical_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects_profiles"
    ADD CONSTRAINT "projects_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_accounts"
    ADD CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "unique_relationship" UNIQUE ("individual_a", "individual_b");



ALTER TABLE ONLY "public"."accounts_breaches"
    ADD CONSTRAINT "unique_relationship_breaches" UNIQUE ("breach_id", "account");



ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "unique_relationship_individuals" UNIQUE ("individual_a", "individual_b");



CREATE OR REPLACE TRIGGER "after_investigation_insert" AFTER INSERT ON "public"."investigations" FOR EACH ROW EXECUTE FUNCTION "public"."create_investigation_profile"();



CREATE OR REPLACE TRIGGER "on_investigation_insert" AFTER INSERT ON "public"."investigations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_investigation"();



CREATE OR REPLACE TRIGGER "on_investigation_insert" AFTER INSERT ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_project"();



CREATE OR REPLACE TRIGGER "on_investigation_insert_folder" AFTER INSERT ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_project_folder"();



CREATE OR REPLACE TRIGGER "on_project_insert" AFTER INSERT ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_project"();



CREATE OR REPLACE TRIGGER "trigger_update_project_last_updated" AFTER UPDATE ON "public"."investigations" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_last_updated"();



CREATE OR REPLACE TRIGGER "trigger_update_project_last_updated_emails" AFTER INSERT OR DELETE OR UPDATE ON "public"."emails" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_last_updated"();



CREATE OR REPLACE TRIGGER "trigger_update_project_last_updated_individuals" AFTER INSERT OR DELETE OR UPDATE ON "public"."individuals" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_last_updated"();



CREATE OR REPLACE TRIGGER "trigger_update_project_last_updated_ip_addresses" AFTER INSERT OR DELETE OR UPDATE ON "public"."ip_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_last_updated"();



CREATE OR REPLACE TRIGGER "trigger_update_project_last_updated_phone_numbers" AFTER INSERT OR DELETE OR UPDATE ON "public"."phone_numbers" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_last_updated"();



CREATE OR REPLACE TRIGGER "trigger_update_project_last_updated_physical_addresses" AFTER INSERT OR DELETE OR UPDATE ON "public"."physical_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_last_updated"();



CREATE OR REPLACE TRIGGER "trigger_update_project_last_updated_relationships" AFTER INSERT OR DELETE OR UPDATE ON "public"."relationships" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_last_updated"();



CREATE OR REPLACE TRIGGER "trigger_update_project_last_updated_social_accounts" AFTER INSERT OR DELETE OR UPDATE ON "public"."social_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_last_updated"();



CREATE OR REPLACE TRIGGER "update_last_updated_at_trigger" AFTER UPDATE ON "public"."investigations" FOR EACH ROW EXECUTE FUNCTION "public"."update_last_updated_at"();



ALTER TABLE ONLY "public"."accounts_breaches"
    ADD CONSTRAINT "accounts_breaches_breach_id_fkey" FOREIGN KEY ("breach_id") REFERENCES "public"."breaches"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "public"."individuals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedbacks"
    ADD CONSTRAINT "feedbacks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id");



ALTER TABLE ONLY "public"."individuals"
    ADD CONSTRAINT "individuals_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."individuals"
    ADD CONSTRAINT "individuals_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investigations"
    ADD CONSTRAINT "investigations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."investigations_profiles"
    ADD CONSTRAINT "investigations_profiles_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investigations_profiles"
    ADD CONSTRAINT "investigations_profiles_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investigations"
    ADD CONSTRAINT "investigations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ip_addresses"
    ADD CONSTRAINT "ip_addresses_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "public"."individuals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ip_addresses"
    ADD CONSTRAINT "ip_addresses_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."phone_numbers"
    ADD CONSTRAINT "phone_numbers_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "public"."individuals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."phone_numbers"
    ADD CONSTRAINT "phone_numbers_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."physical_addresses"
    ADD CONSTRAINT "physical_addresses_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "public"."individuals"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."physical_addresses"
    ADD CONSTRAINT "physical_addresses_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."projects_profiles"
    ADD CONSTRAINT "projects_profiles_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects_profiles"
    ADD CONSTRAINT "projects_profiles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_individual_a_fkey" FOREIGN KEY ("individual_a") REFERENCES "public"."individuals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_individual_b_fkey" FOREIGN KEY ("individual_b") REFERENCES "public"."individuals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."social_accounts"
    ADD CONSTRAINT "social_accounts_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "public"."individuals"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."social_accounts"
    ADD CONSTRAINT "social_accounts_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Allow insert on table investigations for authenticated users." ON "public"."investigations" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anybody can insert a new scan" ON "public"."scans" FOR INSERT WITH CHECK (true);



CREATE POLICY "Auth users can insert a new project" ON "public"."projects_profiles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can delete relationships for their investig" ON "public"."relationships" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."investigation_id" = "relationships"."investigation_id") AND ("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Authenticated users can delete their emails related to their in" ON "public"."emails" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "emails"."investigation_id")))));



CREATE POLICY "Authenticated users can delete their individuals related to the" ON "public"."individuals" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "individuals"."investigation_id")))));



CREATE POLICY "Authenticated users can delete their investigations" ON "public"."investigations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."investigation_id" = "investigations"."id") AND ("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Authenticated users can delete their ip_addresses related to th" ON "public"."ip_addresses" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "ip_addresses"."investigation_id")))));



CREATE POLICY "Authenticated users can delete their own account breaches" ON "public"."accounts_breaches" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete their own account breaches" ON "public"."breaches" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete their own investigations profile" ON "public"."investigations_profiles" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



CREATE POLICY "Authenticated users can delete their own profiles" ON "public"."profiles" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Authenticated users can delete their phone_numbers related to t" ON "public"."phone_numbers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "phone_numbers"."investigation_id")))));



CREATE POLICY "Authenticated users can delete their physical_addresses related" ON "public"."physical_addresses" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "physical_addresses"."investigation_id")))));



CREATE POLICY "Authenticated users can delete their social_accounts" ON "public"."social_accounts" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "social_accounts"."investigation_id")))));



CREATE POLICY "Authenticated users can insert account breaches" ON "public"."accounts_breaches" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert account breaches" ON "public"."breaches" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert emails related to their investig" ON "public"."emails" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert individuals related to their inv" ON "public"."individuals" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert investigations profiles" ON "public"."investigations_profiles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert ip_addresses related to their in" ON "public"."ip_addresses" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert phone_numbers related to their i" ON "public"."phone_numbers" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert physical_addresses related to th" ON "public"."physical_addresses" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert relationships for their investig" ON "public"."relationships" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."investigation_id" = "relationships"."investigation_id") AND ("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Authenticated users can insert social_accounts related" ON "public"."social_accounts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can update relationships for their investig" ON "public"."relationships" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."investigation_id" = "relationships"."investigation_id") AND ("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK (true);



CREATE POLICY "Authenticated users can update their emails related to their in" ON "public"."emails" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "emails"."investigation_id"))))) WITH CHECK (true);



CREATE POLICY "Authenticated users can update their individuals related to the" ON "public"."individuals" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "individuals"."investigation_id"))))) WITH CHECK (true);



CREATE POLICY "Authenticated users can update their investigations" ON "public"."investigations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."investigation_id" = "investigations"."id") AND ("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK (true);



CREATE POLICY "Authenticated users can update their ip_addresses related to th" ON "public"."ip_addresses" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "ip_addresses"."investigation_id"))))) WITH CHECK (true);



CREATE POLICY "Authenticated users can update their own account breaches" ON "public"."accounts_breaches" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can update their own account breaches" ON "public"."breaches" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can update their own investigations profile" ON "public"."investigations_profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id")) WITH CHECK (true);



CREATE POLICY "Authenticated users can update their own profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK (true);



CREATE POLICY "Authenticated users can update their phone_numbers related to t" ON "public"."phone_numbers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "phone_numbers"."investigation_id"))))) WITH CHECK (true);



CREATE POLICY "Authenticated users can update their physical_addresses related" ON "public"."physical_addresses" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "physical_addresses"."investigation_id"))))) WITH CHECK (true);



CREATE POLICY "Authenticated users can update their social_accounts" ON "public"."social_accounts" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "social_accounts"."investigation_id"))))) WITH CHECK (true);



CREATE POLICY "Authenticated users can view relationships for their investigat" ON "public"."relationships" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."investigation_id" = "relationships"."investigation_id") AND ("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Authenticated users can view their emails related to their inve" ON "public"."emails" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "emails"."investigation_id")))));



CREATE POLICY "Authenticated users can view their individuals related to their" ON "public"."individuals" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "individuals"."investigation_id")))));



CREATE POLICY "Authenticated users can view their investigations" ON "public"."investigations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."investigation_id" = "investigations"."id") AND ("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Authenticated users can view their ip_addresses related to thei" ON "public"."ip_addresses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "ip_addresses"."investigation_id")))));



CREATE POLICY "Authenticated users can view their own account breaches" ON "public"."accounts_breaches" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view their own account breaches" ON "public"."breaches" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view their own investigations profiles" ON "public"."investigations_profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



CREATE POLICY "Authenticated users can view their own profiles" ON "public"."investigations" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "owner_id"));



CREATE POLICY "Authenticated users can view their own profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Authenticated users can view their phone_numbers related to the" ON "public"."phone_numbers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "phone_numbers"."investigation_id")))));



CREATE POLICY "Authenticated users can view their physical_addresses related t" ON "public"."physical_addresses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "physical_addresses"."investigation_id")))));



CREATE POLICY "Authenticated users can view their social_accounts related to t" ON "public"."social_accounts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "social_accounts"."investigation_id")))));



CREATE POLICY "Enable read access for all users that have read access to the i" ON "public"."scans" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."investigations_profiles" "ip"
     JOIN "public"."investigations" "i" ON (("ip"."investigation_id" = "i"."id")))
  WHERE ("ip"."investigation_id" = "scans"."investigation_id"))));



CREATE POLICY "Users can add a group to investigations they can see" ON "public"."groups" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "groups"."investigation_id")))));



CREATE POLICY "Users can create projects" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can view groups from investigations they have access to." ON "public"."groups" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "groups"."investigation_id")))));



CREATE POLICY "Users can view their own projects" ON "public"."projects_profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



CREATE POLICY "Users need access to investigation to crud groups" ON "public"."groups" TO "authenticated" USING (true) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."investigations_profiles" "ip"
  WHERE (("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ip"."investigation_id" = "groups"."investigation_id")))));



CREATE POLICY "Users with read access to project can view its investigations" ON "public"."projects" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."projects_profiles" "ip"
  WHERE (("ip"."project_id" = "projects"."id") AND ("ip"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."accounts_breaches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."breaches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."individuals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."investigations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."investigations_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ip_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."phone_numbers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."physical_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."relationships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_accounts" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."scans";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."create_investigation_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_investigation_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_investigation_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_investigation"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_investigation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_investigation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_project"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_project"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_project"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_project_folder"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_project_folder"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_project_folder"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_last_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_last_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_last_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_project_last_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_project_last_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_project_last_updated"() TO "service_role";


















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



GRANT ALL ON TABLE "public"."investigations" TO "anon";
GRANT ALL ON TABLE "public"."investigations" TO "authenticated";
GRANT ALL ON TABLE "public"."investigations" TO "service_role";



GRANT ALL ON TABLE "public"."investigations_profiles" TO "anon";
GRANT ALL ON TABLE "public"."investigations_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."investigations_profiles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."investigations_profiles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."investigations_profiles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."investigations_profiles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ip_addresses" TO "anon";
GRANT ALL ON TABLE "public"."ip_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."ip_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."phone_numbers" TO "anon";
GRANT ALL ON TABLE "public"."phone_numbers" TO "authenticated";
GRANT ALL ON TABLE "public"."phone_numbers" TO "service_role";



GRANT ALL ON TABLE "public"."physical_addresses" TO "anon";
GRANT ALL ON TABLE "public"."physical_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."physical_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."projects_profiles" TO "anon";
GRANT ALL ON TABLE "public"."projects_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."projects_profiles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."projects_profiles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."projects_profiles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."projects_profiles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."relationships" TO "anon";
GRANT ALL ON TABLE "public"."relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."relationships" TO "service_role";



GRANT ALL ON TABLE "public"."scans" TO "anon";
GRANT ALL ON TABLE "public"."scans" TO "authenticated";
GRANT ALL ON TABLE "public"."scans" TO "service_role";



GRANT ALL ON TABLE "public"."social_accounts" TO "anon";
GRANT ALL ON TABLE "public"."social_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."social_accounts" TO "service_role";



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
