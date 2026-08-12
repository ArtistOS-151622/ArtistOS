-- ArtistOS Demo Data Feeder
-- Instructions: Run this script in your Supabase SQL Editor. 
-- It will automatically find the first user in your database and populate their account with demo data.

DO $$ 
DECLARE
    target_user_id BIGINT;
    service_ids BIGINT[] := '{}';
    customer_ids BIGINT[] := '{}';
    i INT;
    b_date DATE;
    start_time TIME;
    end_time TIME;
    status_arr VARCHAR[] := ARRAY['pending', 'confirmed', 'completed', 'cancelled'];
    random_status VARCHAR;
    random_customer BIGINT;
    random_service BIGINT;
    new_booking_id BIGINT;
BEGIN
    -- 1. Find the first user in the database
    SELECT id INTO target_user_id FROM public.users ORDER BY id ASC LIMIT 1;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'No users found. Creating a default Demo User...';
        INSERT INTO public.users (phone, password, artist_name, studio_name, address, email)
        VALUES (
            '9999999999', 
            '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', -- SHA256 for 'password'
            'Demo Artist', 
            'Demo Studio', 
            '123 Demo Lane', 
            'demo@example.com'
        ) RETURNING id INTO target_user_id;
    END IF;

    RAISE NOTICE 'Seeding data for user_id: %', target_user_id;

    -- 2. Insert 20 Services
    FOR i IN 1..20 LOOP
        INSERT INTO public.services (user_id, service_name, duration_minutes, price)
        VALUES (
            target_user_id, 
            'Premium Service ' || i || ' ' || (ARRAY['Tattoo', 'Piercing', 'Consultation', 'Touch-up'])[floor(random() * 4 + 1)], 
            (floor(random() * 4 + 1) * 30), -- 30, 60, 90, 120 mins
            (floor(random() * 10 + 5) * 50.00) -- 250.00 to 700.00
        ) RETURNING id INTO random_service;
        service_ids := array_append(service_ids, random_service);
    END LOOP;

    -- 3. Insert 50 Customers
    FOR i IN 1..50 LOOP
        INSERT INTO public.customers (user_id, customer_name, phone, email, address, reference_by)
        VALUES (
            target_user_id,
            'Demo Customer ' || i,
            '+1555' || lpad(floor(random() * 10000000)::text, 7, '0'),
            'customer' || i || '@example.com',
            floor(random() * 9999 + 1)::text || ' Main Street, City ' || floor(random() * 100 + 1),
            CASE WHEN random() > 0.7 THEN 'Google Search' ELSE 'Friend' END
        ) RETURNING id INTO random_customer;
        customer_ids := array_append(customer_ids, random_customer);
    END LOOP;

    -- 4. Insert 35 Bookings (Past and Future)
    FOR i IN 1..35 LOOP
        -- Generate a date between 30 days ago and 30 days in the future
        b_date := CURRENT_DATE + (floor(random() * 60) - 30)::INT;
        start_time := make_time((floor(random() * 8) + 9)::INT, (floor(random() * 2) * 30)::INT, 0); -- 9 AM to 4 PM
        end_time := start_time + interval '2 hours';
        
        -- Assign logical statuses based on dates
        IF b_date < CURRENT_DATE THEN
            random_status := CASE WHEN random() > 0.1 THEN 'completed' ELSE 'cancelled' END;
        ELSIF b_date = CURRENT_DATE THEN
            random_status := CASE WHEN random() > 0.5 THEN 'confirmed' ELSE 'pending' END;
        ELSE
            random_status := CASE WHEN random() > 0.3 THEN 'confirmed' ELSE 'pending' END;
        END IF;

        random_customer := customer_ids[floor(random() * array_length(customer_ids, 1) + 1)];
        random_service := service_ids[floor(random() * array_length(service_ids, 1) + 1)];

        -- Create the booking
        INSERT INTO public.bookings (
            user_id, customer_id, booking_address, booking_date, start_time, end_time, status, discount
        ) VALUES (
            target_user_id,
            random_customer,
            'Studio Address',
            b_date,
            start_time,
            end_time,
            random_status,
            CASE WHEN random() > 0.8 THEN 50.00 ELSE 0.00 END
        ) RETURNING id INTO new_booking_id;

        -- Attach a service to the booking
        INSERT INTO public.booking_services (booking_id, service_id, quantity, unit_price)
        SELECT new_booking_id, random_service, 1, price FROM public.services WHERE id = random_service;
        
    END LOOP;

    RAISE NOTICE 'Successfully seeded 20 Services, 50 Customers, and 35 Bookings!';
END $$;
