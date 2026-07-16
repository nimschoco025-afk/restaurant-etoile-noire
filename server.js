const express = require('express');
const WebSocket = require('ws');
const mqtt = require('mqtt');
const basicAuth = require('express-basic-auth');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// ============================================
//  1. CONNEXION MQTT (réception des frames)
// ============================================
// ===== CONNEXION HIVEMQ =====
const MQTT_BROKER = 'wss://8bcc471843bd4948823f4960c3ad45e7.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_TOPIC = '#';
const MQTT_USERNAME = 'Étoile-Noire';           // ← le nom d'utilisateur que tu as créé
const MQTT_PASSWORD = 'choco@2026'; // ← le mot de passe que tu as défini

console.log('🔌 Connexion au broker MQTT...');
const mqttClient = mqtt.connect(MQTT_BROKER, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD
});

let latestFrame = null;
let clients = [];

mqttClient.on('connect', () => {
    console.log('✅ Connecté au broker MQTT');
    mqttClient.subscribe(MQTT_TOPIC, (err) => {
        if (!err) {
            console.log(`📡 Abonné au topic: ${MQTT_TOPIC}`);
        } else {
            console.error('❌ Erreur d\'abonnement:', err);
        }
    });
});

mqttClient.on('message', (topic, message) => {
    if (topic === MQTT_TOPIC) {
        // Nouvelle frame JPEG reçue
        latestFrame = message;
        
        // Diffuser à tous les clients WebSocket
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
});

mqttClient.on('error', (err) => {
    console.error('❌ Erreur MQTT:', err);
});

// ============================================
//  2. SERVEUR WEB STATIQUE
// ============================================
app.use(express.static('public'));

// ============================================
//  3. AUTHENTIFICATION ADMIN
// ============================================
// CHANGEZ LE MOT DE PASSE ICI !
const ADMIN_USER = 'admin';
const ADMIN_PASSWORD = 'choco@2026';  // ← MODIFIEZ-MOI !

app.use('/admin', basicAuth({
    users: { [ADMIN_USER]: ADMIN_PASSWORD },
    challenge: true,
    realm: 'Accès Admin - L\'Étoile Noire'
}));

// ============================================
//  4. PAGE DU FLUX ADMIN
// ============================================
app.get('/admin/stream', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'camera.html'));
});

// ============================================
//  5. SERVEUR WEBSOCKET
// ============================================
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
    clients.push(ws);
    console.log(`👤 Client connecté (${clients.length} total)`);
    
    // Envoyer la dernière frame immédiatement
    if (latestFrame) {
        ws.send(latestFrame);
    }
    
    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
        console.log(`👋 Client déconnecté (${clients.length} restant)`);
    });
    
    ws.on('error', (err) => {
        console.error('Erreur WebSocket:', err);
    });
});

// ============================================
//  6. DÉMARRAGE DU SERVEUR
// ============================================
const server = app.listen(port, () => {
    console.log(`\n🚀 Serveur démarré sur le port ${port}`);
    console.log(`🌐 Site public : http://localhost:${port}`);
    console.log(`🔒 Flux admin : http://localhost:${port}/admin/stream`);
    console.log(`👤 Identifiant : ${ADMIN_USER}`);
    console.log(`🔑 Mot de passe : ${ADMIN_PASSWORD}`);
    console.log(`\n📡 En attente des frames MQTT sur le topic: ${MQTT_TOPIC}`);
});

// Intégration WebSocket au serveur HTTP
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    mqttClient.end();
    server.close(() => {
        console.log('✅ Serveur arrêté');
        process.exit(0);
    });
});
