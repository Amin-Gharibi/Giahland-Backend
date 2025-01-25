-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types for status and roles
CREATE TYPE user_role AS ENUM ('admin', 'seller', 'customer');
CREATE TYPE seller_status AS ENUM ('active', 'pending', 'suspended');
CREATE TYPE product_status AS ENUM ('active', 'inactive', 'out_of_stock');
CREATE TYPE comment_status AS ENUM ('pending', 'approved', 'rejected');

-- Create Users table
CREATE TABLE users (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    home_address TEXT,
    home_phone_number VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    profile_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Sellers table
CREATE TABLE sellers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    shop_name VARCHAR(255) NOT NULL UNIQUE,
    rating DECIMAL(3,2) DEFAULT 0.0,
    status seller_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Categories table
CREATE TABLE categories (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    fa_name VARCHAR(255) NOT NULL,
    en_name VARCHAR(255) NOT NULL,
    parent_id uuid REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Products table
CREATE TABLE products (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id uuid REFERENCES sellers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    description TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    status product_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Product Images table
CREATE TABLE product_images (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_main BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Product Features table
CREATE TABLE product_features (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Carts table
CREATE TABLE carts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Cart Items table
CREATE TABLE cart_items (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    cart_id uuid REFERENCES carts(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Blogs table
CREATE TABLE blogs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    author_id uuid REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    en_title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Comments table
CREATE TABLE comments (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    blog_id uuid REFERENCES blogs(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status comment_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Email Verification Codes table
CREATE TABLE email_verifications (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    verification_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    attempts INTEGER DEFAULT 0
);

-- Create Product Categories table
CREATE TABLE product_categories (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, category_id)
);

-- Create Addresses table
CREATE TABLE addresses (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_product_categories_product ON product_categories(product_id);
CREATE INDEX idx_product_categories_category ON product_categories(category_id);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_comments_blog ON comments(blog_id);
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX idx_email_verifications_code ON email_verifications(verification_code);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sellers_updated_at
    BEFORE UPDATE ON sellers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carts_updated_at
    BEFORE UPDATE ON carts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blogs_updated_at
    BEFORE UPDATE ON blogs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user
INSERT INTO users (
    first_name,
    last_name,
    email,
    phone_number,
    password_hash,
    role
) VALUES (
    'Admin',
    'User',
    'admin@giahland.com',
    '09031938364',
    '$2a$10$0lzZoLKyhKO0RkO3GLGS9.89OJuGTsDbJwbgV7JL/NuWLqtuvF7kK',
    'admin'
);

-- Insert some default categories
-- INSERT INTO categories (fa_name, en_name) VALUES
--     ('گل‌های آپارتمانی', 'indoor-plants'),
--     ('گل‌های باغچه‌ای', 'outdoor-plants'),
--     ('گل‌های کاکتوس', 'cactus');