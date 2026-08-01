-- Add language column
ALTER TABLE public.whatsapp_templates ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'English';

-- Insert Hindi and Gujarati templates
INSERT INTO public.whatsapp_templates (title, content, language) VALUES
('Summer Sale ☀️ (Hindi)', 'नमस्ते {{name}}! ☀️\n\nहमारी खास Summer Sale {शुरू हो गई है|देखें}! इस हफ़्ते बुक करने पर {20%|25%|30%} छूट पाएँ। 🏖️\n\nडिस्काउंट के लिए {रिप्लाई करें|हमें मैसेज करें}!', 'Hindi'),
('Reminder 📅 (Hindi)', '{नमस्ते|हैलो} {{name}} 👋\n\nहम सिर्फ यह जानने के लिए मैसेज कर रहे हैं कि क्या आप अभी भी हमारे साथ सेशन बुक चाहते हैं। 🗓️ कोई सवाल हो तो बताएँ!\n\nधन्यवाद, ArtistOS', 'Hindi'),
('Thank You 💖 (Hindi)', '{नमस्ते|हैलो} {{name}}! 💖\n\nहमारे शानदार {क्लाइंट|ग्राहक} बनने के लिए धन्यवाद। हम आपके सपोर्ट की कद्र करते हैं! 🙏', 'Hindi'),

('Summer Sale ☀️ (Gujarati)', 'નમસ્તે {{name}}! ☀️\n\nઅમારું ખાસ સમર સેલ {ચાલુ છે|જુઓ}! આ અઠવાડિયે બુકિંગ પર {20%|25%|30%} ડિસ્કાઉન્ટ મેળવો. 🏖️\n\nડિસ્કાઉન્ટ માટે {રિપ્લાય કરો|અમને મેસેજ કરો}!', 'Gujarati'),
('Reminder 📅 (Gujarati)', '{નમસ્તે|હેલો} {{name}} 👋\n\nઅમે ફક્ત એ જાણવા માટે મેસેજ કરી રહ્યા છીએ કે શું તમે હજુ પણ અમારી સાથે સેશન બુક કરવા માંગો છો. 🗓️ કોઈ પ્રશ્ન હોય તો જણાવો!\n\nઆભાર, ArtistOS', 'Gujarati'),
('Thank You 💖 (Gujarati)', '{નમસ્તે|હેલો} {{name}}! 💖\n\nઅમારા અદ્ભુત {ગ્રાહક|ક્લાયન્ટ} બનવા બદલ આભાર. અમે તમારા સપોર્ટની કદર કરીએ છીએ! 🙏', 'Gujarati');
