-- Sample categories
INSERT INTO categories (id, name, description) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Electronics', 'Electronic devices and gadgets'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Clothing', 'Fashion and apparel'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Books', 'Books and educational materials'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Home & Garden', 'Home improvement and gardening'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Sports', 'Sports and outdoor equipment');

-- Sample admin user (password: admin123)
INSERT INTO users (id, email, first_name, last_name, password_hash, role) VALUES
  ('550e8400-e29b-41d4-a716-446655440100', 'admin@morojs.com', 'Admin', 'User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewlBqPkJFcDUXxXe', 'admin');

-- Sample customer (password: password123)
INSERT INTO users (id, email, first_name, last_name, password_hash, role) VALUES
  ('550e8400-e29b-41d4-a716-446655440101', 'customer@example.com', 'John', 'Doe', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer');

-- Sample products
INSERT INTO products (id, name, description, price, category_id, images, created_by) VALUES
  ('550e8400-e29b-41d4-a716-446655440201', 'MacBook Pro 16"', 'Apple MacBook Pro with M2 chip, 16GB RAM, 512GB SSD', 2499.00, '550e8400-e29b-41d4-a716-446655440001', '["https://example.com/macbook-1.jpg", "https://example.com/macbook-2.jpg"]', '550e8400-e29b-41d4-a716-446655440100'),
  ('550e8400-e29b-41d4-a716-446655440202', 'iPhone 15 Pro', 'Latest iPhone with titanium design and A17 Pro chip', 999.00, '550e8400-e29b-41d4-a716-446655440001', '["https://example.com/iphone-1.jpg"]', '550e8400-e29b-41d4-a716-446655440100'),
  ('550e8400-e29b-41d4-a716-446655440203', 'Nike Air Max 90', 'Classic Nike sneakers with Air Max cushioning', 120.00, '550e8400-e29b-41d4-a716-446655440002', '["https://example.com/nike-1.jpg", "https://example.com/nike-2.jpg"]', '550e8400-e29b-41d4-a716-446655440100'),
  ('550e8400-e29b-41d4-a716-446655440204', 'Clean Code Book', 'A Handbook of Agile Software Craftsmanship by Robert C. Martin', 32.99, '550e8400-e29b-41d4-a716-446655440003', '["https://example.com/book-1.jpg"]', '550e8400-e29b-41d4-a716-446655440100'),
  ('550e8400-e29b-41d4-a716-446655440205', 'Coffee Maker', 'Premium drip coffee maker with programmable timer', 89.99, '550e8400-e29b-41d4-a716-446655440004', '["https://example.com/coffee-1.jpg"]', '550e8400-e29b-41d4-a716-446655440100'),
  ('550e8400-e29b-41d4-a716-446655440206', 'Yoga Mat', 'Non-slip yoga mat with carrying strap', 24.99, '550e8400-e29b-41d4-a716-446655440005', '["https://example.com/yoga-1.jpg"]', '550e8400-e29b-41d4-a716-446655440100'),
  ('550e8400-e29b-41d4-a716-446655440207', 'Wireless Headphones', 'Bluetooth noise-cancelling headphones', 199.99, '550e8400-e29b-41d4-a716-446655440001', '["https://example.com/headphones-1.jpg"]', '550e8400-e29b-41d4-a716-446655440100'),
  ('550e8400-e29b-41d4-a716-446655440208', 'Denim Jacket', 'Classic blue denim jacket, unisex', 79.99, '550e8400-e29b-41d4-a716-446655440002', '["https://example.com/jacket-1.jpg"]', '550e8400-e29b-41d4-a716-446655440100');

-- Sample inventory
INSERT INTO inventory (product_id, quantity) VALUES
  ('550e8400-e29b-41d4-a716-446655440201', 25),
  ('550e8400-e29b-41d4-a716-446655440202', 50),
  ('550e8400-e29b-41d4-a716-446655440203', 100),
  ('550e8400-e29b-41d4-a716-446655440204', 75),
  ('550e8400-e29b-41d4-a716-446655440205', 30),
  ('550e8400-e29b-41d4-a716-446655440206', 150),
  ('550e8400-e29b-41d4-a716-446655440207', 80),
  ('550e8400-e29b-41d4-a716-446655440208', 60);

-- Sample coupons
INSERT INTO coupons (id, code, type, value, minimum_amount, usage_limit) VALUES
  ('550e8400-e29b-41d4-a716-446655440301', 'SAVE10', 'percentage', 10.00, 50.00, 100),
  ('550e8400-e29b-41d4-a716-446655440302', 'WELCOME20', 'fixed', 20.00, 100.00, 50),
  ('550e8400-e29b-41d4-a716-446655440303', 'FREESHIP', 'fixed', 9.99, 75.00, 200);

-- Sample product reviews
INSERT INTO product_reviews (id, product_id, user_id, rating, title, content, verified_purchase) VALUES
  ('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440101', 5, 'Amazing laptop!', 'The performance is incredible and the build quality is top-notch.', true),
  ('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440101', 4, 'Great sneakers', 'Very comfortable for daily wear. Love the classic design.', true),
  ('550e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440101', 5, 'Must-read for developers', 'Essential book for anyone serious about writing clean, maintainable code.', true); 