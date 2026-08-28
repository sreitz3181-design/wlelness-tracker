-- Run once, after schema.sql, to seed your 13 recipes.
-- Replace the subquery if you ever have more than one auth user —
-- it just grabs the single account this app is built for.

insert into recipes (user_id, name, ingredients) values
  ((select id from auth.users limit 1), 'Chicken Tacos', array['Carb Friendly Tortillas','Chicken Broth','Tomato Sauce','Chipotle Peppers','2 Chicken Breast','Shredded Colby Jack Cheese']),
  ((select id from auth.users limit 1), 'Salmon & Broccoli', array['Salmon','Garlic','Lemon','Frozen Broccoli']),
  ((select id from auth.users limit 1), 'Chicken/Kale Salad', array['Sweet Kale Salad Mix','Blueberries','Grilled Chicken']),
  ((select id from auth.users limit 1), 'Southwest Chicken Salad', array['Mexican Corn Salad Mix','Grilled Chicken']),
  ((select id from auth.users limit 1), 'Sushi Bowls', array['2 Brown Rice','Frozen Mahi-Mahi','Pineapple','Mango','Cilantro','Red Onion','Cilantro Avocado Dressing']),
  ((select id from auth.users limit 1), 'Grilled Chicken Breast', array['4 Chicken Breast','Garlic Herb Seasoning','Avocado Oil','Frozen Broccoli (or Green Beans)']),
  ((select id from auth.users limit 1), 'Chicken Burrito Bowls', array['2 Chicken Breast','2 Brown Rice','Cilantro','Lime','Shredded Colby Jack Cheese']),
  ((select id from auth.users limit 1), 'BBC Chicken', array['Whole Chicken','Butter Garlic Rub','2 Sweet Potatoes']),
  ((select id from auth.users limit 1), 'Sesame Chicken', array['Brown Rice','2 Chicken Breasts','Red Bell Pepper','Fresh Broccoli','Fresh Snap Peas','Red Onion','Sesame Teriyaki Sauce']),
  ((select id from auth.users limit 1), 'BBQ Chicken', array['8 Chicken Thighs','BBQ Sauce','BBQ Rub','Frozen Broccoli (or Green Beans)']),
  ((select id from auth.users limit 1), 'Chicken Quesadillas', array['Carb Friendly Tortillas (Large)','2 Chicken Breast','Red Bell Pepper','Onion','Shredded Colby Jack Cheese','Salsa','Sour Cream/Greek Yogurt']),
  ((select id from auth.users limit 1), 'Turkey Meatballs', array['Ground Turkey','Garlic','Egg','Italian Seasoned Bread Crumbs','Frozen Broccoli (or Green Beans)']),
  ((select id from auth.users limit 1), 'Vegetable Beef Soup', array['Beef Broth','2 Sirloin Steaks','Small Potatoes','Canned Diced Tomatoes','Tomato Sauce','Frozen Mixed Vegetables','Lentils']);
