let quizData = null;
let currentClub = null;
let currentPart = "part2";
let timerInterval = null;
let secondsPassed = 0;

document.addEventListener("DOMContentLoaded", () => {
    fetch("data.json")
        .then(response => {
            if (!response.ok) throw new Error("Không thể tải file data.json");
            return response.json();
        })
        .then(data => {
            quizData = data;
            initApp();
        })
        .catch(error => {
            console.error("Lỗi:", error);
            alert("Vui lòng sử dụng Local Web Server (như Live Server) để mở dự án.");
        });
});

function initApp() {
    document.getElementById("appTitle").innerText = quizData.title;

    const clubSelect = document.getElementById("clubSelect");
    clubSelect.innerHTML = "";
    quizData.clubs.forEach(club => {
        const option = document.createElement("option");
        option.value = club.id;
        option.innerText = club.name;
        clubSelect.appendChild(option);
    });

    currentClub = quizData.clubs[0];

    // Chuyển Tab Part 2 / Part 3
    document.getElementById("tabPart2").addEventListener("click", () => switchPart("part2"));
    document.getElementById("tabPart3").addEventListener("click", () => switchPart("part3"));

    // Lắng nghe sự kiện đổi Dropdown
    clubSelect.addEventListener("change", (e) => {
        currentClub = quizData.clubs.find(c => c.id === e.target.value);
        resetAllState();
    });

    // Lắng nghe sự kiện nút bấm
    document.getElementById("checkBtn").addEventListener("click", checkAnswers);
    document.getElementById("resetBtn").addEventListener("click", resetAllState);

    renderCurrentPart();
    startTimer();
}

function switchPart(part) {
    currentPart = part;
    document.getElementById("tabPart2").classList.toggle("active", part === "part2");
    document.getElementById("tabPart3").classList.toggle("active", part === "part3");
    document.getElementById("part2Section").classList.toggle("active", part === "part2");
    document.getElementById("part3Section").classList.toggle("active", part === "part3");
    renderCurrentPart();
}

function renderCurrentPart() {
    if (!currentClub) return;

    if (currentPart === "part2") {
        const p2 = currentClub.part2;
        document.getElementById("p2Instruction").innerHTML = `
            <strong>Yêu cầu:</strong> ${p2.question}<br>
            <small style="color: #555;">${p2.questionTranslation}</small>
        `;
        document.getElementById("p2Question").innerHTML = `
            ${p2.subQuestion}<br>
            <small style="color: #666; font-weight: normal;">${p2.subQuestionTranslation}</small>
        `;

        const textarea = document.getElementById("p2Answer");
        textarea.value = "";
        document.getElementById("p2Result").style.display = "none";
        document.getElementById("p2WordCount").innerText = `Số từ: 0 (Mục tiêu: ${p2.minWords}-${p2.maxWords} từ)`;

        textarea.oninput = () => {
            const count = countWords(textarea.value);
            document.getElementById("p2WordCount").innerText = `Số từ: ${count} (Mục tiêu: ${p2.minWords}-${p2.maxWords} từ)`;
        };
    } else {
        const p3 = currentClub.part3;
        document.getElementById("p3Instruction").innerHTML = `
            <strong>Yêu cầu:</strong> ${p3.instruction}<br>
            <small style="color: #555;">${p3.instructionTranslation}</small>
        `;
        const container = document.getElementById("p3ChatContainer");
        container.innerHTML = "";

        p3.chats.forEach(chat => {
            const block = document.createElement("div");
            block.className = "question-block";
            block.innerHTML = `
                <div class="chat-header">
                    💬 <strong>${chat.user}:</strong> "${chat.message}"<br>
                    <small style="color: #666; font-weight: normal;">${chat.messageTranslation}</small>
                </div>
                <textarea id="p3Answer_${chat.id}" lang="en" spellcheck="true" placeholder="Type your response to ${chat.user} (30-40 words)..."></textarea>
                <div class="word-count" id="p3wc_${chat.id}">Số từ: 0 (Mục tiêu: ${p3.minWords}-${p3.maxWords} từ)</div>
                <div class="result-box" id="p3res_${chat.id}"></div>
            `;
            container.appendChild(block);

            const textarea = block.querySelector("textarea");
            textarea.oninput = () => {
                const count = countWords(textarea.value);
                document.getElementById(`p3wc_${chat.id}`).innerText = `Số từ: ${count} (Mục tiêu: ${p3.minWords}-${p3.maxWords} từ)`;
            };
        });
    }
}

function countWords(str) {
    const text = str.trim();
    return text ? text.split(/\s+/).length : 0;
}

function checkAnswers() {
    if (currentPart === "part2") {
        validateSection(
            document.getElementById("p2Answer").value,
            document.getElementById("p2Result"),
            currentClub.part2.minWords,
            currentClub.part2.maxWords,
            currentClub.part2.sampleAnswer,
            currentClub.part2.sampleAnswerTranslation
        );
    } else {
        currentClub.part3.chats.forEach(chat => {
            const userText = document.getElementById(`p3Answer_${chat.id}`).value;
            const resBox = document.getElementById(`p3res_${chat.id}`);
            validateSection(
                userText,
                resBox,
                currentClub.part3.minWords,
                currentClub.part3.maxWords,
                chat.sampleAnswer,
                chat.sampleAnswerTranslation
            );
        });
    }
}

function validateSection(text, resultBox, min, max, sample, sampleTranslation) {
    text = text.trim();
    resultBox.style.display = "block";

    if (!text) {
        resultBox.innerHTML = `
            <div class="feedback warning">⚠️ Bạn chưa nhập câu trả lời.</div>
            <div class="sample-answer">
                💡 <strong>Đáp án mẫu:</strong><br>${sample}<br>
                <small style="color: #555;">${sampleTranslation}</small>
            </div>
        `;
        return;
    }

    const words = countWords(text);
    let warnings = [];

    if (words < min || words > max) {
        warnings.push(`Độ dài hiện tại là <strong>${words} từ</strong> (yêu cầu từ ${min} - ${max} từ).`);
    }

    if (text.charAt(0) !== text.charAt(0).toUpperCase() && isNaN(text.charAt(0))) {
        warnings.push("Nên viết hoa chữ cái đầu câu.");
    }

    if (!['.', '!', '?'].includes(text.slice(-1))) {
        warnings.push("Nên có dấu chấm kết thúc câu.");
    }

    let html = "";
    if (warnings.length === 0) {
        html = `<div class="feedback success">✔ Định dạng & độ dài câu đạt chuẩn!</div>`;
    } else {
        html = `<div class="feedback warning">⚠️ <strong>Góp ý:</strong><br>- ${warnings.join('<br>- ')}</div>`;
    }

    html += `
        <div class="sample-answer">
            💡 <strong>Đáp án mẫu:</strong><br>${sample}<br>
            <small style="color: #555;">${sampleTranslation}</small>
        </div>
    `;
    resultBox.innerHTML = html;
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        secondsPassed++;
        updateTimerDisplay();
    }, 1000);
}

function updateTimerDisplay() {
    const mins = Math.floor(secondsPassed / 60).toString().padStart(2, '0');
    const secs = (secondsPassed % 60).toString().padStart(2, '0');
    document.getElementById("timer").innerText = `⏱️ Thời gian: ${mins}:${secs}`;
}

function resetAllState() {
    secondsPassed = 0;
    updateTimerDisplay();
    startTimer();
    renderCurrentPart();
}