let audioContext;
let analyser;
let microphone;
let javascriptNode;
let isRecording = false;

// Деректерді жинау үшін
let volumeHistory = []; 
let startTime;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('status');
const canvas = document.getElementById('audioVisualizer');
const ctx = canvas.getContext('2d');
const reportCard = document.getElementById('reportCard');
const analysisResult = document.getElementById('analysisResult');

startBtn.onclick = async () => {
    try {
        // 1. Микрофонға рұқсат сұрау
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // 2. Аудио жүйесін қосу
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        
        // 3. Процессор (дыбыс деңгейін оқу үшін)
        javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;

        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);

        isRecording = true;
        startTime = new Date();
        volumeHistory = []; // Тарихты тазалау

        // Интерфейсті өзгерту
        startBtn.disabled = true;
        stopBtn.disabled = false;
        reportCard.classList.add('hidden');
        statusText.innerText = "Күйі: 🔴 Сабақ талдануда...";

        // 4. Дыбысты әр сәт сайын оқу
        javascriptNode.onaudioprocess = () => {
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);

            // Орташа дыбыс деңгейін есептеу
            let values = 0;
            const length = array.length;
            for (let i = 0; i < length; i++) {
                values += array[i];
            }
            const average = values / length;

            // Деректер базасына сақтау (Жадта ғана)
            if (isRecording) {
                volumeHistory.push(average);
                drawVisualizer(average); // Экранға салу
            }
        };

    } catch (err) {
        alert("Микрофон қосылмады: " + err);
    }
};

stopBtn.onclick = () => {
    isRecording = false;
    audioContext.close();
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusText.innerText = "Күйі: ✅ Талдау аяқталды.";

    generateReport(); // Есеп беру
};

// График сызу (Визуализация)
function drawVisualizer(volume) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Жасыл/Қызыл түс деңгейге байланысты
    let color = volume > 50 ? '#e94560' : '#4ecca3';
    
    ctx.fillStyle = color;
    // График биіктігі
    const height = volume * 2; 
    ctx.fillRect(0, canvas.height - height, canvas.width, height);
}

// 📊 ТАЛДАУ ЛОГИКАСЫ (Бұл ең маңызды жері)
function generateReport() {
    reportCard.classList.remove('hidden');

    const totalSeconds = volumeHistory.length * (2048 / 44100); // Шамамен уақыт
    let silentFrames = 0;
    let speakingFrames = 0;
    let loudFrames = 0;

    // Деректерді сүзу
    volumeHistory.forEach(vol => {
        if (vol < 10) silentFrames++;       // Тыныштық
        else if (vol > 40) loudFrames++;    // Қатты дауыс/Шу
        else speakingFrames++;              // Қалыпты сөйлеу
    });

    const totalFrames = volumeHistory.length;
    const silencePercent = Math.round((silentFrames / totalFrames) * 100);
    const activityPercent = Math.round((speakingFrames / totalFrames) * 100);
    const noisePercent = Math.round((loudFrames / totalFrames) * 100);

    // AI Қорытындысы (Логикалық шарттар)
    let advice = "";
    if (silencePercent > 40) {
        advice = "⚠️ Тым көп үнсіздік болды. Оқушыларға сұрақ қоюды көбейтіңіз.";
    } else if (noisePercent > 30) {
        advice = "⚠️ Сыныпта шу деңгейі жоғары. Тәртіпке назар аударыңыз.";
    } else {
        advice = "✅ Сабақ динамикасы жақсы! Мұғалім мен оқушы тепе-теңдігі сақталған.";
    }

    // Нәтижені шығару
    analysisResult.innerHTML = `
        <div class="stat-item">⏱ <b>Сабақ ұзақтығы:</b> ${Math.round(totalSeconds)} секунд</div>
        <div class="stat-item">🤫 <b>Үнсіздік (Ойлану):</b> ${silencePercent}%</div>
        <div class="stat-item">🗣 <b>Белсенділік:</b> ${activityPercent}%</div>
        <div class="stat-item">🔊 <b>Шу/Қатты дауыс:</b> ${noisePercent}%</div>
        <hr style="border-color: #555">
        <div class="stat-item" style="color: #4ecca3">💡 <b>Black Box кеңесі:</b> <br> ${advice}</div>
    `;
}