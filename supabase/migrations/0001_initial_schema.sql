-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Staff Profiles
create table public.staff_profiles (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    employment_type varchar(20) not null check (employment_type in ('employee', 'outsourcing')),
    is_invoice_registered boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Outsourcing Contracts
create table public.outsourcing_contracts (
    id uuid primary key default uuid_generate_v4(),
    staff_id uuid references public.staff_profiles(id) on delete cascade not null,
    tech_sales_ratio numeric(5,2) not null,
    product_sales_ratio numeric(5,2) not null,
    nomination_fee integer not null,
    transport_fee_limit integer not null,
    deduction_consumption_tax boolean default false,
    deduction_cashless_ratio numeric(5,2) default 0.00,
    deduction_minimo_fee boolean default false,
    deduction_rakuten_fee boolean default false,
    deduction_nailie_fee boolean default false,
    deduction_nomination_fee boolean default false,
    valid_from date not null,
    valid_to date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Attendance Records
create table public.attendance_records (
    id uuid primary key default uuid_generate_v4(),
    staff_id uuid references public.staff_profiles(id) on delete cascade not null,
    date date not null,
    clock_in timestamp with time zone,
    clock_out timestamp with time zone,
    break_minutes integer default 0,
    paid_leave_hours integer default 0,
    status varchar(20) not null check (status in ('normal', 'leave', 'absence')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Sales Records
create table public.sales_records (
    id uuid primary key default uuid_generate_v4(),
    staff_id uuid references public.staff_profiles(id) on delete cascade not null,
    date date not null,
    tech_sales integer default 0 not null,
    product_sales integer default 0 not null,
    nomination_count integer default 0 not null,
    payment_method varchar(50) not null,
    source varchar(50) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Allowance Records
create table public.allowance_records (
    id uuid primary key default uuid_generate_v4(),
    staff_id uuid references public.staff_profiles(id) on delete cascade not null,
    target_month varchar(7) not null, -- format 'YYYY-MM'
    allowance_type varchar(50) not null, -- 'review', 'blog', 'campaign'
    amount integer not null,
    target_details jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Monthly Statements
create table public.monthly_statements (
    id uuid primary key default uuid_generate_v4(),
    staff_id uuid references public.staff_profiles(id) on delete cascade not null,
    target_month varchar(7) not null, -- format 'YYYY-MM'
    statement_type varchar(20) not null check (statement_type in ('salary', 'reward')),
    base_snapshot jsonb not null,
    base_amount integer not null,
    total_allowances integer not null,
    total_deductions integer not null,
    final_paid_amount integer not null,
    status varchar(20) not null check (status in ('draft', 'closed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Audit Logs
create table public.audit_logs (
    id uuid primary key default uuid_generate_v4(),
    table_name varchar(100) not null,
    record_id uuid not null,
    action varchar(10) not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
    old_data jsonb,
    new_data jsonb,
    changed_by uuid,
    changed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Database Triggers for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_staff_profiles_modtime
BEFORE UPDATE ON staff_profiles FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_outsourcing_contracts_modtime
BEFORE UPDATE ON outsourcing_contracts FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_attendance_records_modtime
BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_sales_records_modtime
BEFORE UPDATE ON sales_records FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_allowance_records_modtime
BEFORE UPDATE ON allowance_records FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_monthly_statements_modtime
BEFORE UPDATE ON monthly_statements FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Function for Audit Logging
CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME::text, OLD.id, TG_OP, row_to_json(OLD), NULL);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME::text, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), NULL);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME::text, NEW.id, TG_OP, row_to_json(NEW), NULL);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_staff_profiles
AFTER INSERT OR UPDATE OR DELETE ON staff_profiles
FOR EACH ROW EXECUTE PROCEDURE process_audit_log();

CREATE TRIGGER audit_outsourcing_contracts
AFTER INSERT OR UPDATE OR DELETE ON outsourcing_contracts
FOR EACH ROW EXECUTE PROCEDURE process_audit_log();

CREATE TRIGGER audit_attendance_records
AFTER INSERT OR UPDATE OR DELETE ON attendance_records
FOR EACH ROW EXECUTE PROCEDURE process_audit_log();

CREATE TRIGGER audit_sales_records
AFTER INSERT OR UPDATE OR DELETE ON sales_records
FOR EACH ROW EXECUTE PROCEDURE process_audit_log();

CREATE TRIGGER audit_allowance_records
AFTER INSERT OR UPDATE OR DELETE ON allowance_records
FOR EACH ROW EXECUTE PROCEDURE process_audit_log();

CREATE TRIGGER audit_monthly_statements
AFTER INSERT OR UPDATE OR DELETE ON monthly_statements
FOR EACH ROW EXECUTE PROCEDURE process_audit_log();

-- Initial Seed Data
INSERT INTO staff_profiles (id, name, employment_type, is_invoice_registered) VALUES
('b1b2c123-1111-2222-3333-444455556666', '佐藤', 'outsourcing', true),
('c2c3d234-1111-2222-3333-444455556666', '北野', 'outsourcing', false);

INSERT INTO outsourcing_contracts (staff_id, tech_sales_ratio, product_sales_ratio, nomination_fee, transport_fee_limit, deduction_consumption_tax, deduction_cashless_ratio, deduction_minimo_fee, deduction_rakuten_fee, deduction_nailie_fee, deduction_nomination_fee, valid_from) VALUES
('b1b2c123-1111-2222-3333-444455556666', 65.00, 10.00, 550, 15000, false, 3.60, true, true, false, true, '2026-01-01'),
('c2c3d234-1111-2222-3333-444455556666', 50.00, 10.00, 300, 0, true, 3.60, true, true, true, true, '2026-01-01');
