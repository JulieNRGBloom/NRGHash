--
-- PostgreSQL database dump
--

-- Dumped from database version 14.13 (Homebrew)
-- Dumped by pg_dump version 16.4

-- Started on 2025-03-30 14:04:39 EDT

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

--
-- TOC entry 4 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: xbtsupernode
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO xbtsupernode;

--
-- TOC entry 232 (class 1255 OID 41066)
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_timestamp() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 214 (class 1259 OID 40961)
-- Name: blocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blocks (
    block_id integer NOT NULL,
    block_hash character varying(64) NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    bitcoin_mined double precision NOT NULL,
    size integer,
    difficulty double precision,
    height integer
);


ALTER TABLE public.blocks OWNER TO postgres;

--
-- TOC entry 213 (class 1259 OID 40960)
-- Name: blocks_block_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.blocks_block_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.blocks_block_id_seq OWNER TO postgres;

--
-- TOC entry 3829 (class 0 OID 0)
-- Dependencies: 213
-- Name: blocks_block_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.blocks_block_id_seq OWNED BY public.blocks.block_id;


--
-- TOC entry 231 (class 1259 OID 49276)
-- Name: hashrate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hashrate (
    id integer NOT NULL,
    total_hashrate_th integer NOT NULL,
    rented_hashrate_th integer DEFAULT 0 NOT NULL,
    available_hashrate_th integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.hashrate OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 49275)
-- Name: hashrate_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.hashrate_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hashrate_id_seq OWNER TO postgres;

--
-- TOC entry 3830 (class 0 OID 0)
-- Dependencies: 230
-- Name: hashrate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.hashrate_id_seq OWNED BY public.hashrate.id;


--
-- TOC entry 227 (class 1259 OID 49235)
-- Name: interruptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.interruptions (
    interruption_id integer NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    reason text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.interruptions OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 49234)
-- Name: interruptions_interruption_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.interruptions_interruption_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.interruptions_interruption_id_seq OWNER TO postgres;

--
-- TOC entry 3831 (class 0 OID 0)
-- Dependencies: 226
-- Name: interruptions_interruption_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.interruptions_interruption_id_seq OWNED BY public.interruptions.interruption_id;


--
-- TOC entry 217 (class 1259 OID 40992)
-- Name: metadata; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metadata (
    key character varying(255) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE public.metadata OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 49216)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    message text NOT NULL,
    title text NOT NULL,
    importance character varying(20),
    created_at timestamp without time zone DEFAULT now(),
    icon character varying(50),
    is_read boolean DEFAULT false,
    CONSTRAINT notifications_importance_check CHECK (((importance)::text = ANY ((ARRAY['normal'::character varying, 'important'::character varying])::text[])))
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 49215)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- TOC entry 3832 (class 0 OID 0)
-- Dependencies: 224
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 229 (class 1259 OID 49251)
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    token_id integer NOT NULL,
    user_id integer,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 49250)
-- Name: refresh_tokens_token_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.refresh_tokens_token_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refresh_tokens_token_id_seq OWNER TO postgres;

--
-- TOC entry 3833 (class 0 OID 0)
-- Dependencies: 228
-- Name: refresh_tokens_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.refresh_tokens_token_id_seq OWNED BY public.refresh_tokens.token_id;


--
-- TOC entry 216 (class 1259 OID 40970)
-- Name: subscription_blocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscription_blocks (
    id integer NOT NULL,
    subscription_id integer NOT NULL,
    block_id integer NOT NULL,
    bitcoin_allocated double precision NOT NULL,
    allocated_at timestamp with time zone DEFAULT now(),
    height integer
);


ALTER TABLE public.subscription_blocks OWNER TO postgres;

--
-- TOC entry 215 (class 1259 OID 40969)
-- Name: subscription_blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscription_blocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_blocks_id_seq OWNER TO postgres;

--
-- TOC entry 3834 (class 0 OID 0)
-- Dependencies: 215
-- Name: subscription_blocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscription_blocks_id_seq OWNED BY public.subscription_blocks.id;


--
-- TOC entry 212 (class 1259 OID 32779)
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    subscription_id integer NOT NULL,
    user_id integer NOT NULL,
    hashrate numeric(15,2) NOT NULL,
    is_valid boolean DEFAULT true,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    mining_pool_fee numeric(16,8) DEFAULT 0.0,
    hosting_costs numeric(18,2) DEFAULT 0.00,
    hosting_fees_btc numeric(18,8) DEFAULT 0,
    profit_btc numeric(18,8) DEFAULT 0,
    interruption_minutes integer DEFAULT 0
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- TOC entry 211 (class 1259 OID 32778)
-- Name: subscriptions_subscription_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscriptions_subscription_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscriptions_subscription_id_seq OWNER TO postgres;

--
-- TOC entry 3835 (class 0 OID 0)
-- Dependencies: 211
-- Name: subscriptions_subscription_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscriptions_subscription_id_seq OWNED BY public.subscriptions.subscription_id;


--
-- TOC entry 219 (class 1259 OID 41016)
-- Name: user_mined_bitcoins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_mined_bitcoins (
    id integer NOT NULL,
    user_id integer,
    total_mined_btc numeric(16,8) DEFAULT 0.0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_mined_bitcoins OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 41015)
-- Name: user_mined_bitcoins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_mined_bitcoins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_mined_bitcoins_id_seq OWNER TO postgres;

--
-- TOC entry 3836 (class 0 OID 0)
-- Dependencies: 218
-- Name: user_mined_bitcoins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_mined_bitcoins_id_seq OWNED BY public.user_mined_bitcoins.id;


--
-- TOC entry 210 (class 1259 OID 32770)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    bank_name character varying(100),
    bank_account_number character varying(50),
    account_holder_name character varying(100),
    role character varying(10) DEFAULT 'user'::character varying NOT NULL,
    email character varying(100)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 209 (class 1259 OID 32769)
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_user_id_seq OWNER TO postgres;

--
-- TOC entry 3837 (class 0 OID 0)
-- Dependencies: 209
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- TOC entry 221 (class 1259 OID 41031)
-- Name: wallets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallets (
    id integer NOT NULL,
    user_id integer,
    available_btc numeric(16,8) DEFAULT 0.0,
    pending_withdrawal numeric(16,8) DEFAULT 0.0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.wallets OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 41030)
-- Name: wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wallets_id_seq OWNER TO postgres;

--
-- TOC entry 3838 (class 0 OID 0)
-- Dependencies: 220
-- Name: wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wallets_id_seq OWNED BY public.wallets.id;


--
-- TOC entry 223 (class 1259 OID 41047)
-- Name: withdrawal_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.withdrawal_requests (
    id integer NOT NULL,
    user_id integer,
    amount_ngn numeric(16,2) NOT NULL,
    amount_btc numeric(16,8) NOT NULL,
    bank_name character varying(100) NOT NULL,
    bank_account_number character varying(50) NOT NULL,
    account_holder_name character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'Pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_processed boolean DEFAULT false,
    is_rejected boolean DEFAULT false,
    CONSTRAINT withdrawal_requests_status_check CHECK (((status)::text = ANY ((ARRAY['Pending'::character varying, 'Completed'::character varying, 'Failed'::character varying])::text[])))
);


ALTER TABLE public.withdrawal_requests OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 41046)
-- Name: withdrawal_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.withdrawal_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.withdrawal_requests_id_seq OWNER TO postgres;

--
-- TOC entry 3839 (class 0 OID 0)
-- Dependencies: 222
-- Name: withdrawal_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.withdrawal_requests_id_seq OWNED BY public.withdrawal_requests.id;


--
-- TOC entry 3580 (class 2604 OID 40964)
-- Name: blocks block_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocks ALTER COLUMN block_id SET DEFAULT nextval('public.blocks_block_id_seq'::regclass);


--
-- TOC entry 3605 (class 2604 OID 49279)
-- Name: hashrate id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hashrate ALTER COLUMN id SET DEFAULT nextval('public.hashrate_id_seq'::regclass);


--
-- TOC entry 3601 (class 2604 OID 49238)
-- Name: interruptions interruption_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interruptions ALTER COLUMN interruption_id SET DEFAULT nextval('public.interruptions_interruption_id_seq'::regclass);


--
-- TOC entry 3598 (class 2604 OID 49219)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 3603 (class 2604 OID 49254)
-- Name: refresh_tokens token_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN token_id SET DEFAULT nextval('public.refresh_tokens_token_id_seq'::regclass);


--
-- TOC entry 3581 (class 2604 OID 40973)
-- Name: subscription_blocks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_blocks ALTER COLUMN id SET DEFAULT nextval('public.subscription_blocks_id_seq'::regclass);


--
-- TOC entry 3573 (class 2604 OID 32782)
-- Name: subscriptions subscription_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN subscription_id SET DEFAULT nextval('public.subscriptions_subscription_id_seq'::regclass);


--
-- TOC entry 3583 (class 2604 OID 41019)
-- Name: user_mined_bitcoins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_mined_bitcoins ALTER COLUMN id SET DEFAULT nextval('public.user_mined_bitcoins_id_seq'::regclass);


--
-- TOC entry 3571 (class 2604 OID 32773)
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- TOC entry 3587 (class 2604 OID 41034)
-- Name: wallets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets ALTER COLUMN id SET DEFAULT nextval('public.wallets_id_seq'::regclass);


--
-- TOC entry 3592 (class 2604 OID 41050)
-- Name: withdrawal_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_requests ALTER COLUMN id SET DEFAULT nextval('public.withdrawal_requests_id_seq'::regclass);


--
-- TOC entry 3805 (class 0 OID 40961)
-- Dependencies: 214
-- Data for Name: blocks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blocks (block_id, block_hash, "timestamp", bitcoin_mined, size, difficulty, height) FROM stdin;
\.


--
-- TOC entry 3822 (class 0 OID 49276)
-- Dependencies: 231
-- Data for Name: hashrate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.hashrate (id, total_hashrate_th, rented_hashrate_th, available_hashrate_th) FROM stdin;
1	250	0	250
\.


--
-- TOC entry 3818 (class 0 OID 49235)
-- Dependencies: 227
-- Data for Name: interruptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.interruptions (interruption_id, start_time, end_time, reason, created_at) FROM stdin;
\.


--
-- TOC entry 3808 (class 0 OID 40992)
-- Dependencies: 217
-- Data for Name: metadata; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.metadata (key, value) FROM stdin;
last_block_hash	000000000000000000007d8f8c8a1e6fd0d47b6ef7a63ed1359f319c52edab37
\.


--
-- TOC entry 3816 (class 0 OID 49216)
-- Dependencies: 225
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, message, title, importance, created_at, icon, is_read) FROM stdin;
\.


--
-- TOC entry 3820 (class 0 OID 49251)
-- Dependencies: 229
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (token_id, user_id, token, expires_at, created_at) FROM stdin;
13	1	1f2e0e17ab592d0d0ee6c4bcc75913c4ab874325c5daaebaf93910575479c06e33a13bb536f59a3705d1a98ca5cfc44c821d5f8932ff61cadcb334e608a069a5	2025-03-22 00:39:48.008	2025-03-15 00:39:48.008722
15	1	4fe112db5e62509aaf4a24dd04304208a8cee2d8cc2fd7dfaf788e363ef9a0141bc408b03898a9b6e2c2da2e7e929a37972e87911c82e974af1ae32a5cc0ae91	2025-03-22 01:07:16.535	2025-03-15 01:07:16.535363
17	1	ad2d267ea8b4cbb94cc142c87057ccc412dd53d0876dd775ed4ce0a94baba6428b94b0751c584b2658ee3b01d8852961a7e85ba2fca514e507172094db561d07	2025-03-22 13:24:19.412	2025-03-15 13:24:19.41246
18	1	b1c1515f2012df8a16e352a02c8b5651701ee37e25018422a1a12801bae15af18a51d01788ca54aee25353cd5c8ebc69ba98109fc98ac28c2a7f95c02957a03c	2025-03-27 22:04:45.623	2025-03-20 22:04:45.624112
19	1	d5f4d19f237ea0dd3cf79c26bec6934a8cf082c8ae8ea0eb56001230d7809207860e568eb28310ce5000b2904a0f12b2a15750e4d0a3cd08fd5bc97153f1ae46	2025-04-05 18:12:17.886	2025-03-29 18:12:17.886729
20	1	bdbce19d267943ceb206b8c04af614359bcb562a9ece5c0e1f53f3fd8155528a95d442954e834a6dc0e69468b753887131499733829f1ccb04b5bc907ffba07b	2025-04-05 19:17:07.608	2025-03-29 19:17:07.609226
22	1	98db711911e9bfae1c05b67b54ffc9c408d1a0c870d378a6a996fde81bd78c11738dd432fa7c9c88ab376fe444880cd1193401188e9aa693dad3b30f9142900a	2025-04-06 12:21:00.099	2025-03-30 12:21:00.09938
\.


--
-- TOC entry 3807 (class 0 OID 40970)
-- Dependencies: 216
-- Data for Name: subscription_blocks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscription_blocks (id, subscription_id, block_id, bitcoin_allocated, allocated_at, height) FROM stdin;
\.


--
-- TOC entry 3803 (class 0 OID 32779)
-- Dependencies: 212
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscriptions (subscription_id, user_id, hashrate, is_valid, start_date, end_date, mining_pool_fee, hosting_costs, hosting_fees_btc, profit_btc, interruption_minutes) FROM stdin;
\.


--
-- TOC entry 3810 (class 0 OID 41016)
-- Dependencies: 219
-- Data for Name: user_mined_bitcoins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_mined_bitcoins (id, user_id, total_mined_btc, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3801 (class 0 OID 32770)
-- Dependencies: 210
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (user_id, username, password_hash, bank_name, bank_account_number, account_holder_name, role, email) FROM stdin;
1	Julie	$2b$10$YaJIsUelqLzPgTSXEbPFAO3eZamoH9Xtjq/VlpNJ/DYEVM3wuLmTW	Td Bank	5678345rtdf456	Julie Peeters	admin	julie@nrgbloom.com
2	Makir	$2b$10$YaJIsUelqLzPgTSXEbPFAO3eZamoH9Xtjq/VlpNJ/DYEVM3wuLmTW	Scotia	jdjh37r2	Makir	admin	makir@nrgbloom.com
5	Ola	$2b$10$q0Y4LHTkl.zFZkQYtcLiKeCYvepNPNF62ZG0xYKHJaDAnrH4b83HK	\N	\N	\N	admin	ola@nrgbloom.com
\.


--
-- TOC entry 3812 (class 0 OID 41031)
-- Dependencies: 221
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wallets (id, user_id, available_btc, pending_withdrawal, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3814 (class 0 OID 41047)
-- Dependencies: 223
-- Data for Name: withdrawal_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.withdrawal_requests (id, user_id, amount_ngn, amount_btc, bank_name, bank_account_number, account_holder_name, status, created_at, updated_at, is_processed, is_rejected) FROM stdin;
\.


--
-- TOC entry 3840 (class 0 OID 0)
-- Dependencies: 213
-- Name: blocks_block_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.blocks_block_id_seq', 1019, true);


--
-- TOC entry 3841 (class 0 OID 0)
-- Dependencies: 230
-- Name: hashrate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.hashrate_id_seq', 1, true);


--
-- TOC entry 3842 (class 0 OID 0)
-- Dependencies: 226
-- Name: interruptions_interruption_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.interruptions_interruption_id_seq', 32, true);


--
-- TOC entry 3843 (class 0 OID 0)
-- Dependencies: 224
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 454, true);


--
-- TOC entry 3844 (class 0 OID 0)
-- Dependencies: 228
-- Name: refresh_tokens_token_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.refresh_tokens_token_id_seq', 22, true);


--
-- TOC entry 3845 (class 0 OID 0)
-- Dependencies: 215
-- Name: subscription_blocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscription_blocks_id_seq', 1515, true);


--
-- TOC entry 3846 (class 0 OID 0)
-- Dependencies: 211
-- Name: subscriptions_subscription_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscriptions_subscription_id_seq', 43, true);


--
-- TOC entry 3847 (class 0 OID 0)
-- Dependencies: 218
-- Name: user_mined_bitcoins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_mined_bitcoins_id_seq', 11, true);


--
-- TOC entry 3848 (class 0 OID 0)
-- Dependencies: 209
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_user_id_seq', 9, true);


--
-- TOC entry 3849 (class 0 OID 0)
-- Dependencies: 220
-- Name: wallets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.wallets_id_seq', 12, true);


--
-- TOC entry 3850 (class 0 OID 0)
-- Dependencies: 222
-- Name: withdrawal_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.withdrawal_requests_id_seq', 25, true);


--
-- TOC entry 3617 (class 2606 OID 40968)
-- Name: blocks blocks_block_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_block_hash_key UNIQUE (block_hash);


--
-- TOC entry 3619 (class 2606 OID 40966)
-- Name: blocks blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_pkey PRIMARY KEY (block_id);


--
-- TOC entry 3649 (class 2606 OID 49283)
-- Name: hashrate hashrate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hashrate
    ADD CONSTRAINT hashrate_pkey PRIMARY KEY (id);


--
-- TOC entry 3645 (class 2606 OID 49243)
-- Name: interruptions interruptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interruptions
    ADD CONSTRAINT interruptions_pkey PRIMARY KEY (interruption_id);


--
-- TOC entry 3631 (class 2606 OID 40998)
-- Name: metadata metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metadata
    ADD CONSTRAINT metadata_pkey PRIMARY KEY (key);


--
-- TOC entry 3643 (class 2606 OID 49226)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 3647 (class 2606 OID 49259)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (token_id);


--
-- TOC entry 3626 (class 2606 OID 40976)
-- Name: subscription_blocks subscription_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_blocks
    ADD CONSTRAINT subscription_blocks_pkey PRIMARY KEY (id);


--
-- TOC entry 3628 (class 2606 OID 40978)
-- Name: subscription_blocks subscription_blocks_subscription_id_block_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_blocks
    ADD CONSTRAINT subscription_blocks_subscription_id_block_id_key UNIQUE (subscription_id, block_id);


--
-- TOC entry 3615 (class 2606 OID 32785)
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (subscription_id);


--
-- TOC entry 3622 (class 2606 OID 41001)
-- Name: blocks unique_height; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT unique_height UNIQUE (height);


--
-- TOC entry 3633 (class 2606 OID 49207)
-- Name: user_mined_bitcoins unique_user_id_mined; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_mined_bitcoins
    ADD CONSTRAINT unique_user_id_mined UNIQUE (user_id);


--
-- TOC entry 3637 (class 2606 OID 49209)
-- Name: wallets unique_user_id_wallet; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT unique_user_id_wallet UNIQUE (user_id);


--
-- TOC entry 3635 (class 2606 OID 41024)
-- Name: user_mined_bitcoins user_mined_bitcoins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_mined_bitcoins
    ADD CONSTRAINT user_mined_bitcoins_pkey PRIMARY KEY (id);


--
-- TOC entry 3611 (class 2606 OID 32775)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 3613 (class 2606 OID 32777)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 3639 (class 2606 OID 41040)
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- TOC entry 3641 (class 2606 OID 41056)
-- Name: withdrawal_requests withdrawal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 3620 (class 1259 OID 40989)
-- Name: idx_blocks_block_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_blocks_block_hash ON public.blocks USING btree (block_hash);


--
-- TOC entry 3629 (class 1259 OID 40999)
-- Name: idx_metadata_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_metadata_key ON public.metadata USING btree (key);


--
-- TOC entry 3623 (class 1259 OID 40991)
-- Name: idx_subscription_blocks_block_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscription_blocks_block_id ON public.subscription_blocks USING btree (block_id);


--
-- TOC entry 3624 (class 1259 OID 40990)
-- Name: idx_subscription_blocks_subscription_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscription_blocks_subscription_id ON public.subscription_blocks USING btree (subscription_id);


--
-- TOC entry 3658 (class 2620 OID 41067)
-- Name: user_mined_bitcoins set_timestamp_user_mined_bitcoins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_timestamp_user_mined_bitcoins BEFORE UPDATE ON public.user_mined_bitcoins FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- TOC entry 3659 (class 2620 OID 41068)
-- Name: wallets set_timestamp_wallets; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_timestamp_wallets BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- TOC entry 3660 (class 2620 OID 41069)
-- Name: withdrawal_requests set_timestamp_withdrawal_requests; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_timestamp_withdrawal_requests BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- TOC entry 3656 (class 2606 OID 49227)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3657 (class 2606 OID 49260)
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3651 (class 2606 OID 40984)
-- Name: subscription_blocks subscription_blocks_block_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_blocks
    ADD CONSTRAINT subscription_blocks_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.blocks(block_id) ON DELETE CASCADE;


--
-- TOC entry 3652 (class 2606 OID 40979)
-- Name: subscription_blocks subscription_blocks_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_blocks
    ADD CONSTRAINT subscription_blocks_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(subscription_id) ON DELETE CASCADE;


--
-- TOC entry 3650 (class 2606 OID 32786)
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- TOC entry 3653 (class 2606 OID 41025)
-- Name: user_mined_bitcoins user_mined_bitcoins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_mined_bitcoins
    ADD CONSTRAINT user_mined_bitcoins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3654 (class 2606 OID 41041)
-- Name: wallets wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3655 (class 2606 OID 41057)
-- Name: withdrawal_requests withdrawal_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3828 (class 0 OID 0)
-- Dependencies: 4
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: xbtsupernode
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


-- Completed on 2025-03-30 14:04:39 EDT

--
-- PostgreSQL database dump complete
--

