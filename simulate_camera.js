// simulate_camera.js
const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

// Configuration MQTT (identique à votre serveur)
const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const MQTT_TOPIC = 'restaurant/camera/frame';

// Connexion au broker
const client = mqtt.connect(MQTT_BROKER);

client.on('connect', () => {
    console.log('✅ Simulateur connecté au broker MQTT');
    console.log('📤 Envoi de messages sur le topic:', MQTT_TOPIC);
    sendSimulatedFrames();
});

// Fonction pour envoyer des messages simulés
function sendSimulatedFrames() {
    let counter = 0;
    
    setInterval(() => {
        counter++;
        // Créer un message simulé (pour les tests, on envoie du texte)
        const message = JSON.stringify({
            type: 'simulated_frame',
            timestamp: new Date().toISOString(),
            frame_number: counter,
            message: 'Ceci est un test de flux MQTT'
        });
        
        client.publish(MQTT_TOPIC, message);
        console.log(`📤 Frame ${counter} envoyée`);
        
        // Pour simuler une image JPEG, vous pouvez aussi envoyer un fichier image
        // C'est plus avancé, mais ça fonctionne !
        if (counter % 5 === 0) {
            sendImageFile();
        }
    }, 1000); // Toutes les secondes
}

// Fonction pour envoyer une vraie image (optionnel)
function sendImageFile() {
    try {
        // Créez un dossier "images" et mettez une image test.jpg dedans
        const imagePath = path.join(__dirname, 'images', 'test.jpg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            client.publish(MQTT_TOPIC, imageBuffer);
            console.log('📸 Image JPEG envoyée !');
        }
    } catch (err) {
        // Pas d'image, on ignore
    }
}

// Gestion de la fermeture
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du simulateur...');
    client.end();
    process.exit(0);
});