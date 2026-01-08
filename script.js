let audioContext;
let analyser;
let microphone;
let javascriptNode;
let isRecording = false;

// Талдау деректері
let teacherSeconds = 0;
let studentSeconds = 0;
let silenceSeconds = 0;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const speakerIndicator = document.getElementById('speakerIndicator');
const canvas = document.getElementById('audioVisualizer');
const ctx = canvas.getContext('2d');
const reportCard = document.getElementById('reportCard');
const analysisResult = document.getElementById('analysisResult');

startBtn.onclick = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

        // Фурье түрлендіруі (Жиілікті алу үшін)
        analyser.fftSize = 2048; 

        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);

        isRecording = true;
        
        // Есептегіштерді нөлдеу
        teacherSeconds = 0;
        studentSeconds = 0;
        silenceSeconds = 0;

        startBtn.disabled = true;
        stopBtn.disabled = false;
        reportCard.classList.add('hidden');

        javascriptNode.onaudioprocess = () => {
            if (!isRecording) return;

            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);

            // 1. Дыбыс деңгейін анықтау
            let values = 0;
            let length = array.length;
            for (let i = 0; i < length; i++) values += array[i];
            const averageVolume = values / length;

            // 2. Доминантты жиілікті (Pitch) анықтау
            let maxVal = -1;
            let maxIndex = -1;
            for (let i = 0; i < length; i++) {
                if (array[i] > maxVal) {
                    maxVal = array[i];
                    maxIndex = i;
                }
            }
            // Жиілік (Hz) формуласы: Index * SampleRate / FFT_Size
            const frequency = maxIndex * (audioContext.sampleRate / analyser.fftSize);

            analyzeSpeaker(averageVolume, frequency);
            drawVisualizer(array);
        };

    } catch (err) {
        alert("Қате: " + err);
    }
};

stopBtn.onclick = () => {
    isRecording = false;
    audioContext.close();
    startBtn.disabled = false;
    stopBtn.disabled = true;
    speakerIndicator.innerText = "🛑 Талдау аяқталды";
    speakerIndicator.className = "speaker-box";
    generateAdvancedReport();
};

// 🧠 ЖАСАНДЫ ИНТЕЛЛЕКТ ЛОГИКАСЫ (Кім сөйлеп тұр?)
function analyzeSpeaker(volume, frequency) {
    // 1. Егер дыбыс өте төмен болса -> Үнсіздік
    if (volume < 10) {
        speakerIndicator.innerText = "🤫 Үнсіздік";
        speakerIndicator.className = "speaker-box";
        silenceSeconds += 0.046; // шамамен 1 цикл уақыты
    } 
    // 2. Егер дыбыс бар болса, жиілікті тексереміз
    else {
        // Мұғалім фильтрі: Төменгі жиілік (ересек) немесе ұзақ монотонды дауыс
        // Оқушы фильтрі: Жоғары жиілік (бала) немесе қатты эмоционалды секірістер
        
        // Шартты жиілік шегі: 250Hz (Бұл шамамен, ер адам мен бала арасы)
        if (frequency < 280) { 
            speakerIndicator.innerText = "👨‍🏫 Мұғалім сөйлеп тұр";
            speakerIndicator.className = "speaker-box teacher-mode";
            teacherSeconds += 0.046;
        } else {
            speakerIndicator.innerText = "🙋‍♂️ Оқушы сөйлеп тұр";
            speakerIndicator.className = "speaker-box student-mode";
            studentSeconds += 0.046;
        }
    }
}

function drawVisualizer(array) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / array.length) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < array.length; i++) {
        barHeight = array[i] / 2;
        // Мұғалімге жасыл, Оқушыға қызыл реңк
        ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`; 
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }
}

function generateAdvancedReport() {
    reportCard.classList.remove('hidden');
    
    const total = teacherSeconds + studentSeconds + silenceSeconds;
    const teacherPct = Math.round((teacherSeconds / total) * 100);
    const studentPct = Math.round((studentSeconds / total) * 100);
    const silencePct = Math.round((silenceSeconds / total) * 100);

    let verdict = "";
    if (teacherPct > 70) verdict = "📢 Лекциялық стиль басым. Оқушыларды көбірек қатыстырыңыз.";
    else if (studentPct > 40) verdict = "✅ Керемет! Интерактивті сабақ.";
    else verdict = "⚖️ Сабақ балансы жақсы сақталған.";

    analysisResult.innerHTML = `
        <div class="stat-item">👨‍🏫 <b>Мұғалім сөзі:</b> ${teacherPct}% (${Math.round(teacherSeconds)} сек)</div>
        <div class="stat-item">🙋‍♂️ <b>Оқушы сөзі:</b> ${studentPct}% (${Math.round(studentSeconds)} сек)</div>
        <div class="stat-item">🤫 <b>Үнсіздік:</b> ${silencePct}%</div>
        <hr>
        <div class="stat-item" style="color: #4ecca3">📊 <b>AI Қорытындысы:</b> <br>${verdict}</div>
    `;
}