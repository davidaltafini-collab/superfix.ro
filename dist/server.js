import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.status(401).json({ message: "Lipsă token" });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err)
            return res.status(403).json({ message: "Token invalid" });
        req.user = user;
        next();
    });
};

// === EMAIL CONFIG ===
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
});

// === SEO SITEMAP GENERATOR ===
app.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = process.env.FRONTEND_URL || 'https://super-fix.ro';
        
        const heroes = await prisma.hero.findMany({
            select: { id: true }
        });
        
        const staticPages = [
            '',
            '/register',
            '/heroes',
            '/legal'
        ];
        
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            ${staticPages
            .map((url) => {
            return `
                    <url>
                        <loc>${baseUrl}${url}</loc>
                        <changefreq>daily</changefreq>
                        <priority>0.8</priority>
                    </url>`;
        })
            .join('')}
            ${heroes
            .map((hero) => {
            return `
                    <url>
                        <loc>${baseUrl}/hero/${hero.id}</loc>
                        <lastmod>${new Date().toISOString()}</lastmod>
                        <changefreq>weekly</changefreq>
                        <priority>1.0</priority>
                    </url>`;
        })
            .join('')}
        </urlset>`;
        
        res.header('Content-Type', 'application/xml');
        res.send(sitemap);
    }
    catch (error) {
        console.error('Sitemap error:', error);
        res.status(500).end();
    }
});

// === MESAJE "CATERINCĂ" (Stil Superfix) ===
const FUNNY_MESSAGES = {
    HERO_ALERT: [
        "Știu că probabil salvezi planeta (sau bei o cafea), dar avem o urgență!",
        "Lăsați totul jos! Cineva are nevoie de tine mai mult decât are nevoie Batman de Robin.",
        "Nu e semnalul de pe cer, dar e un mail de la Superfix. Avem treabă!",
        "Între două pauze, te rugăm să arunci un ochi aici. Un cetățean e la ananghie.",
        "Sper că ți-ai încărcat bateriile (și sculele). Misiune nouă la orizont!",
        "Ridică-te, eroule! Nu e timp de stat, țevile (sau prizele) nu se repară singure.",
        "Alertă de gradul 0! (Bine, poate gradul 1, dar tot e important). Te bagi?",
        "Apel de urgență! Dacă nu răspunzi tu, cine o să o facă? Superman e ocupat.",
        "Ai un nou dosar pe birou. Sper că ți-ai luat pelerina la tine azi.",
        "Cetățenii strigă după ajutor! E momentul tău de glorie (și de făcut bani)."
    ],
    CLIENT_WAITING: [
        "Semnalul a fost trimis! Eroul nostru își termină probabil gogoașa și revine.",
        "Am lansat porumbelul digital. Acum așteptăm să vedem dacă eroul e disponibil.",
        "Cererea ta e pe masa eroului. Să sperăm că nu e prins în trafic intergalactic.",
        "Răbdare! Eroul nostru analizează situația tactic (și logistic).",
        "Nu intra în panică! Superfix e pe fir. Îi dăm de urmă imediat.",
        "Mesajul a ajuns! Eroul își verifică agenda între două salvări spectaculoase.",
        "Stai liniștit, nu te-am uitat. Eroul își caută cheile de la Batmobil.",
        "Conectare în curs... Eroul a primit notificarea. Așteptăm semnul lui.",
        "Sistemul nostru a alertat specialistul. Să vedem dacă acceptă provocarea!",
        "Eroul știe de tine. Acum e o chestiune de minute până răspunde."
    ],
    MISSION_ACCEPTED: [
        "Veste bună! Eroul a zis 'DA'. Pregătește-te, ajutorul e pe drum!",
        "Avem confirmare! Eroul și-a pus centura și vine spre tine.",
        "Bingo! Misiune acceptată. Poți să respiri ușurat acum.",
        "E oficial: Eroul se ocupă de cazul tău. Rămâi pe recepție!",
        "Succes! Agentul Superfix a preluat comanda. Problema ta e ca și rezolvată.",
        "Eroul vine! Sperăm că ai cafeaua pregătită (opțional, dar recomandat).",
        "S-a rezolvat (aproape)! Eroul a confirmat intervenția.",
        "Nu mai ești singur în lupta asta. Eroul a acceptat provocarea!",
        "Start misiune! Eroul a plecat spre locația ta.",
        "Confirmare primită. Eroul nostru e gata de acțiune!"
    ],
    MISSION_REJECTED: [
        "Ghinion! Eroul e prins într-o luptă crâncenă (probabil are altă lucrare).",
        "Din păcate, eroul nostru e indisponibil momentan. Dar nu renunța!",
        "Se pare că eroul e în altă dimensiune acum. Te rugăm alege pe altcineva.",
        "Misiune refuzată. Eroul e suprasolicitat azi. Încearcă un alt specialist!",
        "Eroul a zis 'Pas' de data asta. Nu o lua personal, e doar foarte ocupat.",
        "Semnal pierdut. Eroul nu poate prelua cazul tău acum.",
        "Busy signal! Eroul are mâinile pline. Caută un alt agent în listă.",
        "Nu a fost să fie cu acest erou. Dar Liga Superfix e mare, alege altul!",
        "Eroul e indisponibil. Probabil salvează lumea în alt cartier.",
        "Refuz tactic. Eroul nu poate ajunge. Te rugăm să selectezi alt profesionist."
    ],
    MISSION_COMPLETED: [
        "Misiune Îndeplinită! Încă o zi, încă o problemă rezolvată.",
        "Boom! S-a rezolvat. Eroul și-a făcut treaba și a dispărut în apus.",
        "Dosar închis cu succes! Sperăm că ești mulțumit de rezultat.",
        "Victorie! Totul ar trebui să meargă brici acum. Nu uita de recenzie!",
        "Gata! Eroul a învins problema. Dacă ți-a plăcut, dă-i 5 stele!",
        "Curat, rapid, eficient. Asta înseamnă să lucrezi cu Superfix.",
        "O altă faptă bună bifată. Mulțumim că ai avut încredere în noi!",
        "Eroul a raportat succesul misiunii. Tu ce zici? Totul ok?",
        "Misiune executată! Poți să te relaxezi acum.",
        "Problema a fost neutralizată. Felicitări pentru o nouă colaborare reușită!"
    ]
};

const getRandomMsg = (type) => {
    const list = FUNNY_MESSAGES[type];
    return list[Math.floor(Math.random() * list.length)];
};

// === TEMPLATE EMAIL "DOSAR APLICAȚIE" (DESIGN FIX CA ÎN POZĂ) ===
const getSuperfixTemplate = (title, message, dataFields = {}, ctaLink, ctaText) => {
    let fieldsHtml = '';
    for (const [key, value] of Object.entries(dataFields)) {
        fieldsHtml += `
        <div style="background-color: #fffbeb; border: 2px dashed #000; padding: 10px; margin-bottom: 15px; position: relative;">
            <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; color: #000;">${key}</div>
            <div style="font-size: 16px; font-weight: bold; color: #000; font-family: 'Courier New', monospace;">${value}</div>
        </div>`;
    }
    
    return `
<!DOCTYPE html>
<html>
<head>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap');
    body { background-color: #f3f4f6; font-family: sans-serif; padding: 20px; }
    .container { 
        max-width: 600px; 
        margin: 0 auto; 
        background: #fff; 
        border: 4px solid #000; 
        box-shadow: 8px 8px 0 #000; 
        overflow: hidden;
    }
    .header {
        background: #fff;
        padding: 20px;
        text-align: center;
        border-bottom: 4px solid #000;
        position: relative;
    }
    .logo-box {
        display: inline-block;
        background-color: #ef4444;
        padding: 10px 20px;
        border: 3px solid #000;
        transform: rotate(-2deg);
        box-shadow: 3px 3px 0 #000;
    }
    .logo-text {
        color: #fff;
        font-family: 'Inter', sans-serif;
        font-weight: 900;
        font-style: italic;
        font-size: 32px;
        margin: 0;
        letter-spacing: -1px;
        line-height: 1;
    }
    .stamp {
        position: absolute;
        top: 20px;
        right: 20px;
        border: 3px solid #dc2626;
        color: #dc2626;
        font-weight: bold;
        padding: 5px 10px;
        transform: rotate(15deg);
        font-family: 'Courier New', Courier, monospace;
        font-size: 14px;
        opacity: 0.7;
    }
    .content { padding: 30px; }
    .title {
        font-family: 'Inter', sans-serif;
        font-weight: 900;
        text-transform: uppercase;
        font-size: 24px;
        margin-bottom: 10px;
        border-bottom: 4px solid #000;
        display: inline-block;
    }
    .message {
        font-size: 16px;
        line-height: 1.6;
        color: #333;
        margin-bottom: 20px;
        font-style: italic;
    }
    .btn {
        display: block;
        width: fit-content;
        margin: 30px auto 0;
        background-color: #ef4444;
        color: #fff !important;
        text-decoration: none;
        padding: 15px 30px;
        font-weight: 900;
        text-transform: uppercase;
        border: 3px solid #000;
        box-shadow: 5px 5px 0 #000;
        font-family: sans-serif;
    }
    .btn:hover {
        background-color: #000;
        color: #fff !important;
    }
    .footer {
        background: #000;
        color: #fff;
        padding: 15px;
        text-align: center;
        font-size: 11px;
        font-family: monospace;
    }
</style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-box">
                <h1 class="logo-text">SUPERFIX</h1>
            </div>
            <div class="stamp">CONFIDENȚIAL</div>
        </div>
        <div class="content">
            <h2 class="title">${title}</h2>
            <p class="message">${message}</p>
            
            ${Object.keys(dataFields).length > 0 ? `<div style="margin-top: 20px;">${fieldsHtml}</div>` : ''}

            ${ctaLink ? `<a href="${ctaLink}" class="btn">${ctaText || 'ACCESEAZĂ'}</a>` : ''}
        </div>
        <div class="footer">
            GENERAT DE CARTIERUL GENERAL SUPERFIX<br>
            Strict Secret • Numai pentru ochii tăi
        </div>
    </div>
</body>
</html>
    `;
};

async function sendEmail(to, subject, title, message, dataFields = {}, ctaLink, ctaText) {
    try {
        await transporter.sendMail({
            from: `"SuperFix HQ" <${process.env.EMAIL_USER}>`,
            to,
            subject: `📁 ${subject}`,
            html: getSuperfixTemplate(title, message, dataFields, ctaLink, ctaText)
        });
        console.log(`📧 Email trimis către ${to}`);
    }
    catch (error) {
        console.error("❌ Eroare Email:", error);
    }
}

// === AUTH ROUTES ===
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await prisma.admin.findUnique({ where: { username } });
        if (!admin || !await bcrypt.compare(password, admin.passwordHash))
            return res.status(401).json({ message: "Credențiale invalide" });
        const token = jwt.sign({ id: admin.id, role: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, role: 'ADMIN' });
    }
    catch (e) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/auth/hero-login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hero = await prisma.hero.findUnique({ where: { username } });
        if (!hero || !await bcrypt.compare(password, hero.passwordHash))
            return res.status(401).json({ message: "Date incorecte" });
        const token = jwt.sign({ id: hero.id, role: 'HERO', alias: hero.alias }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, role: 'HERO', heroId: hero.id });
    }
    catch (e) {
        res.status(500).json({ error: "Server error" });
    }
});

// === PUBLIC ROUTES ===
app.post('/api/apply-hero', async (req, res) => {
    try {
        const { name, email, phone, category, message } = req.body;
        
        // ✅ VERIFICARE: Email duplicat în aplicații
        const existingApplication = await prisma.heroApplication.findFirst({
            where: { email }
        });
        
        if (existingApplication) {
            return res.status(400).json({ 
                error: "Ai deja o aplicație înregistrată cu acest email! Verifică inbox-ul sau așteaptă răspunsul nostru." 
            });
        }
        
        // ✅ VERIFICARE: Email deja erou activ
        const existingHero = await prisma.hero.findFirst({
            where: { email }
        });
        
        if (existingHero) {
            return res.status(400).json({ 
                error: "Acest email are deja un cont de erou activ! Încearcă să te loghezi în portal." 
            });
        }
        
        await prisma.heroApplication.create({ data: { name, email, phone, category, message } });
        
        // ✅ Email Admin cu BUTON
        await sendEmail(
            process.env.EMAIL_USER,
            "APLICAȚIE NOUĂ",
            "DOSAR RECRUT",
            `Un nou civil vrea să devină erou! Verifică dacă are stofă de Superfix.`,
            { 
                "Candidat": name, 
                "Specializare": category, 
                "Contact": phone,
                "Mesaj": message || 'Niciun mesaj'
            },
            `${process.env.FRONTEND_URL}/admin`,
            "DESCHIDE PORTAL ADMIN"
        );
        
        // Email Applicant
        await sendEmail(
            email,
            "APLICAȚIE PRIMITĂ",
            "STAND BY",
            "Salut viitorule Erou, dosarul tău a ajuns la Cartierul General. Agenții noștri îl analizează chiar acum. Dacă ai 'factorul X', te contactăm!",
            { "Status Curent": "ÎN AȘTEPTARE (PENDING)" }
        );
        
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Eroare aplicare" });
    }
});

// === ADMIN ROUTES ===
app.get('/api/admin/applications', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN')
        return res.status(403).json({ error: "Forbidden" });
    const apps = await prisma.heroApplication.findMany({ orderBy: { date: 'desc' } });
    res.json(apps);
});

app.delete('/api/admin/applications/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN')
        return res.status(403).json({ error: "Forbidden" });
    try {
        const appId = req.params.id;
        
        const application = await prisma.heroApplication.findUnique({
            where: { id: appId }
        });
        
        if (application) {
            const isAccepted = await prisma.hero.findFirst({
                where: { email: application.email }
            });

            if (!isAccepted) {
                await sendEmail(
                    application.email,
                    "STATUS APLICAȚIE",
                    "DOSAR RESPINS",
                    `Salut ${application.name}, mulțumim pentru interesul acordat Ligii Superfix. Din păcate, în acest moment profilul tău nu corespunde cu nevoile noastre operative sau locurile sunt ocupate.`,
                    { "Status": "RESPINS (REJECTED)", "Motiv": "Selecție competitivă" },
                    `${process.env.FRONTEND_URL}/`,
                    "ÎNAPOI LA SITE"
                );
            }

            await prisma.heroApplication.delete({ where: { id: appId } });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Delete failed" });
    }
});

// === ✅ FIX PRINCIPAL: VALIDARE EMAIL + ALIAS DUPLICAT + EMAIL ÎN 2 PAȘI ===
app.post('/api/heroes', authenticateToken, async (req, res) => {
    try {
        const { username, alias, password, email, ...rest } = req.body;
        
        // ✅ VALIDARE 1: Username duplicat
        const existingUsername = await prisma.hero.findUnique({ where: { username } });
        if (existingUsername)
            return res.status(400).json({ error: "Username-ul este deja folosit!" });

        // ✅ VALIDARE 2: Email duplicat (IMPORTANT!)
        if (email) {
            const existingEmail = await prisma.hero.findFirst({ where: { email } });
            if (existingEmail)
                return res.status(400).json({ error: "Acest email are deja un cont de erou!" });
        }

        const plainPassword = password || "Hero123!";
        const passwordHash = await bcrypt.hash(plainPassword, 10);
        const trustFactor = rest.trustFactor || 50;

        const newHero = await prisma.hero.create({
            data: { username, alias, passwordHash, email, trustFactor, missionsCompleted: 0, ...rest }
        });

        if (email) {
            // ✅ EMAIL 1: Credențiale de acces (FĂRĂ link în dataFields)
            await sendEmail(
                email,
                "BINE AI VENIT ÎN LIGĂ!",
                "DOSAR APROBAT - ACCES PORTAL",
                `Salut ${alias}, ai fost recrutat oficial în Liga SuperFix! Iată datele tale de acces la Portal:`,
                { 
                    "Username": username, 
                    "Parola": plainPassword
                },
                `${process.env.FRONTEND_URL}/portal`,
                "INTRĂ ÎN PORTAL"
            );

            // ✅ EMAIL 2: Onboarding SIMPLIFICAT
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const youtubeLink = "https://youtube.com/shorts/qlgBAqtwgcI?si=aU7hANKvO317h5HJ"; // <--- Vei completa tu
            const onboardingLink = `${frontendUrl}/onboarding?id=${newHero.id}`;
            
            console.log(`🔗 Link onboarding generat: ${onboardingLink}`);
            console.log(`📧 Trimitem email onboarding către: ${email}`);
            
            await sendEmail(
                email,
                "PASUL 2: ACTIVEAZĂ-ȚI PROFILUL",
                "COMPLETEAZĂ ÎNROLAREA",
                `Salut ${alias}! Poți prelua misiuni, dar mai trebuie să termini procesul de înrolare. Apasă butonul de mai jos pentru a completa datele profilului tău.`,
                {}, // Fără dataFields
                onboardingLink,
                "TERMINĂ ÎNROLAREA"
            );
            
            console.log(`✅ Ambele emailuri trimise cu succes către ${email}`);
        }
        
        res.json({ success: true, heroId: newHero.id });
    }
    catch (error) {
        console.error("❌ Eroare creare erou:", error);
        res.status(500).json({ error: "Eroare internă server" });
    }
});

app.put('/api/heroes/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Forbidden" });
    try {
        const dataToUpdate = { ...req.body };
        
        if (dataToUpdate.alias) {
            dataToUpdate.slug = dataToUpdate.alias
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }

        if (dataToUpdate.password) {
            dataToUpdate.passwordHash = await bcrypt.hash(dataToUpdate.password, 10);
            delete dataToUpdate.password;
        } else {
            delete dataToUpdate.password;
        }

        delete dataToUpdate.id;
        delete dataToUpdate.reviews;
        delete dataToUpdate.requests;
        delete dataToUpdate.createdAt;
        delete dataToUpdate.updatedAt;

        const updated = await prisma.hero.update({ 
            where: { id: req.params.id }, 
            data: dataToUpdate 
        });
        res.json(updated);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Update failed" });
    }
});

app.delete('/api/heroes/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN')
        return res.status(403).json({ error: "Forbidden" });
    try {
        await prisma.hero.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ error: "Delete failed" });
    }
});

app.get('/api/heroes', async (req, res) => {
    const heroes = await prisma.hero.findMany({ include: { reviews: true } });
    res.json(heroes);
});

app.get('/api/heroes/slug/:slug', async (req, res) => {
    const { slug } = req.params;
    try {
        let hero = await prisma.hero.findUnique({
            where: { slug: slug },
            include: { reviews: true }
        });

        if (!hero) {
            hero = await prisma.hero.findUnique({
                where: { id: slug },
                include: { reviews: true }
            });
        }

        if (!hero) return res.status(404).json({ error: "Erou negăsit" });
        res.json(hero);
    } catch (e) {
        res.status(500).json({ error: "Eroare server" });
    }
});

app.get('/api/heroes/:id', async (req, res) => {
    const hero = await prisma.hero.findUnique({ where: { id: req.params.id }, include: { reviews: true } });
    res.json(hero || {});
});

// === SERVICE REQUESTS & MISSIONS ===
app.post('/api/request', async (req, res) => {
    const { heroId, clientName, clientPhone, clientEmail, description } = req.body;
    try {
        const request = await prisma.serviceRequest.create({
            data: { heroId, clientName, clientPhone, clientEmail, description, status: 'PENDING' }
        });
        const hero = await prisma.hero.findUnique({ where: { id: heroId } });
        
        if (hero?.email) {
            const randomMsg = getRandomMsg('HERO_ALERT');
            await sendEmail(
                hero.email,
                "MISIUNE NOUĂ",
                "COD ROSU",
                randomMsg,
                { "Cetățean": clientName, "Telefon": clientPhone, "Problema": description },
                `${process.env.FRONTEND_URL}/portal`,
                "INTRA ÎN PORTAL"
            );
        }
        
        if (clientEmail) {
            const randomMsg = getRandomMsg('CLIENT_WAITING');
            await sendEmail(
                clientEmail,
                "CERERE TRIMISĂ",
                "CONFIRMARE",
                randomMsg,
                { "Status": "Se așteaptă răspuns", "Erou Contactat": hero?.alias || "N/A" }
            );
        }
        
        res.json({ success: true, id: request.id });
    }
    catch (e) {
        res.status(500).json({ error: "Request error" });
    }
});

app.get('/api/request', authenticateToken, async (req, res) => {
    const requests = await prisma.serviceRequest.findMany({ orderBy: { date: 'desc' }, include: { hero: true } });
    res.json(requests);
});

app.get('/api/hero/my-missions', authenticateToken, async (req, res) => {
    const heroId = req.user.id;
    const missions = await prisma.serviceRequest.findMany({ where: { heroId }, orderBy: { date: 'desc' }, include: { hero: true } });
    res.json(missions);
});

app.put('/api/missions/:id/status', authenticateToken, async (req, res) => {
    const { status, photo } = req.body;
    const missionId = req.params.id;
    const heroId = req.user.id;
    try {
        const mission = await prisma.serviceRequest.findUnique({ where: { id: missionId }, include: { hero: true } });
        
        if (mission?.clientEmail) {
            if (status === 'ACCEPTED') {
                const randomMsg = getRandomMsg('MISSION_ACCEPTED');
                await sendEmail(
                    mission.clientEmail,
                    "EROUL VINE!",
                    "MISIUNE ACCEPTATĂ",
                    randomMsg,
                    { "Agent Asignat": mission.hero.alias, "Status": "ÎN DEPLASARE" }
                );
            }
            else if (status === 'REJECTED') {
                const randomMsg = getRandomMsg('MISSION_REJECTED');
                await sendEmail(
                    mission.clientEmail,
                    "UPDATE MISIUNE",
                    "EROUL INDISPONIBIL",
                    randomMsg,
                    {},
                    `${process.env.FRONTEND_URL}/heroes`,
                    "GĂSEȘTE ALT EROU"
                );
            }
            else if (status === 'COMPLETED') {
                const randomMsg = getRandomMsg('MISSION_COMPLETED');
                await sendEmail(
                    mission.clientEmail,
                    "MISIUNE ÎNDEPLINITĂ",
                    "DOSAR ÎNCHIS",
                    randomMsg,
                    { "Rezultat": "SUCCES", "Erou": mission.hero.alias },
                    `${process.env.FRONTEND_URL}/hero/${mission.hero.slug || mission.hero.id}`,
                    "LASĂ O RECENZIE"
                );
            }
        }
        
        await prisma.serviceRequest.update({
            where: { id: missionId },
            data: {
                status,
                ...(status === 'IN_PROGRESS' ? { photoBefore: photo } : {}),
                ...(status === 'COMPLETED' ? { photoAfter: photo } : {})
            }
        });
        
        if (status === 'COMPLETED') {
            await prisma.hero.update({ where: { id: heroId }, data: { trustFactor: { increment: 5 }, missionsCompleted: { increment: 1 } } });
        }
        
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ error: "Update error" });
    }
});

app.post('/api/reviews', async (req, res) => {
    const { heroId, clientName, rating, comment } = req.body;
    try {
        await prisma.review.create({ data: { heroId, clientName, rating, comment, date: new Date() } });
        if (rating === 5)
            await prisma.hero.update({ where: { id: heroId }, data: { trustFactor: { increment: 2 } } });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ error: "Review error" });
    }
});

// === SISTEM UPDATE PROFIL ===
app.post('/api/hero/submit-update', authenticateToken, async (req, res) => {
    try {
        const { avatarUrl, videoUrl, description, hourlyRate, actionAreas } = req.body;
        const heroId = req.user.id;

        await prisma.heroUpdate.create({
            data: {
                heroId,
                avatarUrl,
                videoUrl,
                description,
                hourlyRate: Number(hourlyRate),
                actionAreas
            }
        });

        const heroInfo = await prisma.hero.findUnique({ where: { id: heroId } });

        await sendEmail(
            process.env.EMAIL_USER,
            "UPDATE PROFIL EROU",
            "DATE NOI ÎN AȘTEPTARE",
            `Agentul ${heroInfo?.alias || 'Necunoscut'} a trimis date noi pentru aprobare. Intră în portalul Admin pentru a valida profilul.`,
            {
                "Erou": heroInfo?.alias || 'Nespecificat',
                "Link Erou": heroInfo?.slug ? `${process.env.FRONTEND_URL}/hero/${heroInfo.slug}` : "Fără link generat încă"
            },
            `${process.env.FRONTEND_URL}/admin`,
            "DESCHIDE PORTAL ADMIN"
        );

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Eroare la trimiterea datelor." });
    }
});

// === ✅ ONBOARDING PUBLIC CU VALIDARE ALIAS DUPLICAT ===
app.post('/api/hero/public-submit-update', async (req, res) => {
    try {
        const { heroId, alias, avatarUrl, videoUrl, description, hourlyRate, actionAreas } = req.body;

        if (!heroId) return res.status(400).json({ error: "Lipsește identificatorul eroului." });

        // ✅ VALIDARE: Verificăm dacă numele este luat de ALT erou
        if (alias) {
            const existingHero = await prisma.hero.findFirst({
                where: {
                    alias: alias,
                    id: { not: heroId }
                }
            });
            if (existingHero) {
                return res.status(400).json({ 
                    error: "Acest nume de erou este deja luat în Ligă! Fii creativ și alege altul (ex: Gigel VIP, Super Instalatorul)." 
                });
            }
        }

        await prisma.heroUpdate.create({
            data: {
                heroId,
                alias,
                avatarUrl,
                videoUrl,
                description,
                hourlyRate: Number(hourlyRate),
                actionAreas
            }
        });
        
        const heroInfo = await prisma.hero.findUnique({ where: { id: heroId } });

        await sendEmail(
            process.env.EMAIL_USER,
            "UPDATE PROFIL EROU",
            "DATE NOI ÎN AȘTEPTARE",
            `Eroul ${heroInfo?.alias || 'Nou'} a trimis date noi pentru profilul său.`,
            {
                "Nume Nou Propus": alias || 'Nespecificat',
                "Erou Actual": heroInfo?.alias || 'Nespecificat'
            },
            `${process.env.FRONTEND_URL}/admin`,
            "DESCHIDE PORTAL ADMIN"
        );

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Eroare la procesarea datelor." });
    }
});

app.get('/api/admin/updates', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Forbidden" });
    
    const updates = await prisma.heroUpdate.findMany({
        where: { status: 'PENDING' },
        include: { hero: true },
        orderBy: { createdAt: 'desc' }
    });
    res.json(updates);
});

app.post('/api/admin/approve-update/:updateId', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Forbidden" });

    try {
        const updateId = req.params.updateId;
        const updateRequest = await prisma.heroUpdate.findUnique({ where: { id: updateId } });
        if (!updateRequest) return res.status(404).json({ error: "Update not found" });

        const updateData = {};
        if (updateRequest.avatarUrl) updateData.avatarUrl = updateRequest.avatarUrl;
        if (updateRequest.videoUrl) updateData.videoUrl = updateRequest.videoUrl;
        if (updateRequest.description) updateData.description = updateRequest.description;
        if (updateRequest.hourlyRate) updateData.hourlyRate = updateRequest.hourlyRate;
        if (updateRequest.actionAreas) updateData.actionAreas = updateRequest.actionAreas;
        
        if (updateRequest.alias) {
            updateData.alias = updateRequest.alias;
            updateData.slug = updateRequest.alias
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }

        await prisma.hero.update({
            where: { id: updateRequest.heroId },
            data: updateData
        });

        await prisma.heroUpdate.delete({ where: { id: updateId } });
        res.json({ success: true, message: "Profil actualizat cu URL curat!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Eroare la aprobare" });
    }
});

app.delete('/api/admin/reject-update/:updateId', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Forbidden" });

    try {
        const updateId = req.params.updateId;
        await prisma.heroUpdate.delete({ where: { id: updateId } });
        res.json({ success: true, message: "Modificare anulată cu succes." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Eroare la ștergerea modificării." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server Backend "SuperFix" rulează pe portul ${PORT}`);
});
