-- Insert recipes
INSERT INTO recipe (name, description) VALUES
('Spaghetti Carbonara', 'A classic Italian pasta dish made with eggs, cheese, pancetta, and pepper.'),
('Chicken Salad', 'A healthy salad with grilled chicken, mixed greens, and a light vinaigrette.'),
('Pancakes', 'Fluffy pancakes perfect for a weekend breakfast.');

-- Insert recipe ingredients
INSERT INTO recipe_ingredient (recipe_id, amount, unit, product_id) VALUES
((SELECT id FROM recipe WHERE name = 'Spaghetti Carbonara' LIMIT 1), 200, 'g', (SELECT id FROM products WHERE name = 'Tomate' LIMIT 1)),
((SELECT id FROM recipe WHERE name = 'Spaghetti Carbonara' LIMIT 1), 100, 'g', (SELECT id FROM products WHERE name = 'Lechuga' LIMIT 1)),
((SELECT id FROM recipe WHERE name = 'Spaghetti Carbonara' LIMIT 1), 2, 'pcs', (SELECT id FROM products WHERE name = 'Pechuga de Pollo' LIMIT 1)),
((SELECT id FROM recipe WHERE name = 'Spaghetti Carbonara' LIMIT 1), 50, 'g', (SELECT id FROM products WHERE name = 'Manzana' LIMIT 1)),
((SELECT id FROM recipe WHERE name = 'Spaghetti Carbonara' LIMIT 1), 1, 'tsp', (SELECT id FROM products WHERE name = 'Plátano' LIMIT 1)),
((SELECT id FROM recipe WHERE name = 'Chicken Salad' LIMIT 1), 200, 'g', (SELECT id FROM products WHERE name = 'Detergente' LIMIT 1)),
((SELECT id FROM recipe WHERE name = 'Chicken Salad' LIMIT 1), 100, 'g', (SELECT id FROM products WHERE name = 'Jabón' LIMIT 1)),
((SELECT id FROM recipe WHERE name = 'Chicken Salad' LIMIT 1), 50, 'ml', (SELECT id FROM products WHERE name = 'Papel Higiénico' LIMIT 1)),
((SELECT id FROM recipe WHERE name = 'Pancakes' LIMIT 1), 200, 'g', (SELECT id FROM products WHERE name = 'Zanahoria' LIMIT 1)),
((SELECT id FROM recipe WHERE name = 'Pancakes' LIMIT 1), 300, 'ml', (SELECT id FROM products WHERE name = 'Carne de ternera' LIMIT 1)),
((SELECT id FROM recipe WHERE name = 'Pancakes' LIMIT 1), 2, 'pcs', (SELECT id FROM products WHERE name = 'Pechuga de Pollo' LIMIT 1)),
((SELECT id FROM recipe WHERE name = 'Pancakes' LIMIT 1), 1, 'tbsp', (SELECT id FROM products WHERE name = 'Cebolla' LIMIT 1)),
((SELECT id FROM recipe WHERE name = 'Pancakes' LIMIT 1), 1, 'tsp', (SELECT id FROM products WHERE name = 'Ajo' LIMIT 1));

-- Insert recipe steps
INSERT INTO recipe_step (recipe_id, step_order, description, name) VALUES
-- Spaghetti Carbonara steps
((SELECT id FROM recipe WHERE name = 'Spaghetti Carbonara' LIMIT 1), 1, 'Cook the spaghetti according to the package instructions.', 'Cook Spaghetti'),
((SELECT id FROM recipe WHERE name = 'Spaghetti Carbonara' LIMIT 1), 2, 'Fry the pancetta until crispy.', 'Fry Pancetta'),
((SELECT id FROM recipe WHERE name = 'Spaghetti Carbonara' LIMIT 1), 3, 'Beat the eggs and mix with grated Parmesan cheese.', 'Prepare Sauce'),
((SELECT id FROM recipe WHERE name = 'Spaghetti Carbonara' LIMIT 1), 4, 'Combine the spaghetti, pancetta, and egg mixture. Season with black pepper.', 'Combine Ingredients'),
-- Chicken Salad steps
((SELECT id FROM recipe WHERE name = 'Chicken Salad' LIMIT 1), 1, 'Grill the chicken until fully cooked.', 'Grill Chicken'),
((SELECT id FROM recipe WHERE name = 'Chicken Salad' LIMIT 1), 2, 'Mix the greens and vinaigrette in a bowl.', 'Prepare Salad'),
((SELECT id FROM recipe WHERE name = 'Chicken Salad' LIMIT 1), 3, 'Slice the grilled chicken and add to the salad.', 'Add Chicken'),
-- Pancakes steps
((SELECT id FROM recipe WHERE name = 'Pancakes' LIMIT 1), 1, 'Mix the flour, sugar, and baking powder in a bowl.', 'Mix Dry Ingredients'),
((SELECT id FROM recipe WHERE name = 'Pancakes' LIMIT 1), 2, 'Whisk the eggs and milk together.', 'Mix Wet Ingredients'),
((SELECT id FROM recipe WHERE name = 'Pancakes' LIMIT 1), 3, 'Combine the wet and dry ingredients to form a batter.', 'Combine Ingredients'),
((SELECT id FROM recipe WHERE name = 'Pancakes' LIMIT 1), 4, 'Cook the pancakes on a hot griddle until golden brown.', 'Cook Pancakes');