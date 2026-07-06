-- SQL Schema for PDF Forge Backend Database (Supabase)

-- 1. Create the public.users table linking to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    credits INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_credit_reset TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read profiles
CREATE POLICY "Allow public read access to users" ON public.users
    FOR SELECT TO authenticated USING (true);

-- Allow users to update their own profile (e.g. credits)
CREATE POLICY "Allow users to update their own profile" ON public.users
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. Create the function that inserts a profile into public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, credits, last_credit_reset)
    VALUES (
        new.id,
        new.email,
        50, -- Default sign up credits
        timezone('utc'::text, now())
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger to fire on new signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Migration check: Add column if it doesn't already exist in active databases
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_credit_reset TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

