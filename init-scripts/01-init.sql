-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types for status and roles
CREATE TYPE user_role AS ENUM ('admin', 'seller', 'customer');
CREATE TYPE seller_status AS ENUM ('active', 'pending', 'suspended');
CREATE TYPE product_status AS ENUM ('active', 'inactive', 'out_of_stock');
CREATE TYPE comment_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE comment_parent_type AS ENUM ('blog', 'product');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

-- Create Users table
CREATE TABLE users (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    home_address TEXT,
    home_phone_number VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    profile_image_url TEXT,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_category_names UNIQUE (fa_name, en_name)
);
-- Create Products table
CREATE TABLE products (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id uuid REFERENCES sellers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price BIGINT NOT NULL,
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
    parent_type comment_parent_type NOT NULL,
    parent_id uuid NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    status comment_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE products
ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.0;

ALTER TABLE blogs
ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.0;

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

-- Create Orders table
CREATE TABLE orders (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
    address_id uuid REFERENCES addresses(id) ON DELETE RESTRICT,
    total_amount DECIMAL(12,2) NOT NULL,
    status order_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Order Items table
CREATE TABLE order_items (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    price_at_time DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create refresh tokens table
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(token)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_product_categories_product ON product_categories(product_id);
CREATE INDEX idx_product_categories_category ON product_categories(category_id);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_comments_parent ON comments(parent_type, parent_id);
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX idx_email_verifications_code ON email_verifications(verification_code);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_users_name ON users((first_name || ' ' || last_name));
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Create triggers for checking parent existence in comments
CREATE OR REPLACE FUNCTION check_comment_parent() RETURNS trigger AS $$
BEGIN
    IF NEW.parent_type = 'blog' THEN
        IF NOT EXISTS (SELECT 1 FROM blogs WHERE id = NEW.parent_id) THEN
            RAISE EXCEPTION 'Referenced blog does not exist';
        END IF;
    ELSIF NEW.parent_type = 'product' THEN
        IF NOT EXISTS (SELECT 1 FROM products WHERE id = NEW.parent_id) THEN
            RAISE EXCEPTION 'Referenced product does not exist';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create function to update average ratings
CREATE OR REPLACE FUNCTION update_average_rating() RETURNS trigger AS $$
BEGIN
    IF NEW.parent_type = 'product' THEN
        -- Update product's average rating
        UPDATE products
        SET average_rating = (
            SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0.0)
            FROM comments
            WHERE parent_type = 'product' 
            AND parent_id = NEW.parent_id
            AND status = 'approved'
        )
        WHERE id = NEW.parent_id;
    ELSIF NEW.parent_type = 'blog' THEN
        -- Update blog's average rating
        UPDATE blogs
        SET average_rating = (
            SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0.0)
            FROM comments
            WHERE parent_type = 'blog' 
            AND parent_id = NEW.parent_id
            AND status = 'approved'
        )
        WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create stock checking when adding item to cart
CREATE OR REPLACE FUNCTION check_product_stock() RETURNS trigger AS $$
BEGIN
    IF (
        SELECT stock 
        FROM products 
        WHERE id = NEW.product_id
    ) < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create clean up function for refresh tokens
CREATE OR REPLACE FUNCTION cleanup_refresh_tokens()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete expired and revoked tokens for the same user
    DELETE FROM refresh_tokens 
    WHERE (expires_at < NOW() OR is_revoked = true);
    
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

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

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER check_comment_parent_trigger
    BEFORE INSERT OR UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION check_comment_parent();

CREATE TRIGGER update_average_rating_trigger
    AFTER INSERT OR UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_average_rating();

CREATE TRIGGER trigger_cleanup_refresh_tokens
    AFTER INSERT ON refresh_tokens
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_refresh_tokens();

-- Insert default admin user
INSERT INTO users (
    first_name,
    last_name,
    email,
    phone_number,
    password_hash,
    role,
    is_verified,
    verified_at
) VALUES (
    'Admin',
    'User',
    'admin@giahland.com',
    '09123456789',
    '$2a$10$0lzZoLKyhKO0RkO3GLGS9.89OJuGTsDbJwbgV7JL/NuWLqtuvF7kK',
    'admin',
    true,
    CURRENT_TIMESTAMP
);