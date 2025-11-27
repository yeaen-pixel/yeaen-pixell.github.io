// 전역 변수
let currentPassword = '';
let selectedDate = '';
let currentView = 'main'; // 'main' or 'detail' or 'calendar'
let editingMode = false;
let editingPassword = '';
let currentCalendarMonth = new Date().getMonth();
let currentCalendarYear = new Date().getFullYear();
let selectedMoodDate = '';

// DOM 요소
const mainView = document.getElementById('main-view');
const detailView = document.getElementById('detail-view');
const calendarGrid = document.getElementById('calendar-grid');
const selectedEntryCard = document.getElementById('selected-entry-card');
const entryDate = document.getElementById('entry-date');
const currentTime = document.getElementById('current-time');
const currentMonth = document.getElementById('current-month');
const detailTime = document.getElementById('detail-time');

// 일기 작성 창 요소
const diaryDateDisplay = document.getElementById('diary-date-display');
const diaryPasswordInput = document.getElementById('diary-password-input');
const unlockBtn = document.getElementById('unlock-btn');
const diaryTextarea = document.getElementById('diary-textarea');
const diarySaveBtn = document.getElementById('diary-save-btn');
const diaryResetBtn = document.getElementById('diary-reset-btn');
const deleteAllBtn = document.getElementById('delete-all-btn');
const messageArea = document.getElementById('message-area');
const menuBtn = document.getElementById('menu-btn');
const menuBtnDetail = document.getElementById('menu-btn-detail');
const menuBtnCalendar = document.getElementById('menu-btn-calendar');
const menuModal = document.getElementById('menu-modal');
const calendarMenuBtn = document.getElementById('calendar-menu-btn');
const writeMenuBtn = document.getElementById('write-menu-btn');
const calendarView = document.getElementById('calendar-view');
const calendarBackBtn = document.getElementById('calendar-back-btn');
const moodCalendarGrid = document.getElementById('mood-calendar-grid');
const calendarMonthYear = document.getElementById('calendar-month-year');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const moodSelectModal = document.getElementById('mood-select-modal');
const closeMoodModalBtn = document.getElementById('close-mood-modal-btn');
const moodEmojiBtns = document.querySelectorAll('.mood-emoji-btn');

// TextEncoder/TextDecoder
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// 간단한 해시 함수 (비밀번호 검증용)
async function simpleHash(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 16); // 처음 16자리만 사용
}

// 암호화 함수
function encrypt(text, password) {
    if (!text || !password) return '';
    try {
        const textBytes = textEncoder.encode(text);
        const passwordBytes = textEncoder.encode(password);
        const encryptedBytes = new Uint8Array(textBytes.length);
        for (let i = 0; i < textBytes.length; i++) {
            const keyByte = passwordBytes[i % passwordBytes.length];
            encryptedBytes[i] = textBytes[i] ^ keyByte;
        }
        let encryptedStr = '';
        for (let i = 0; i < encryptedBytes.length; i++) {
            encryptedStr += String.fromCharCode(encryptedBytes[i]);
        }
        return btoa(encryptedStr);
    } catch (e) {
        console.error('Encryption error:', e);
        return '';
    }
}

// 복호화 함수
function decrypt(encryptedText, password) {
    if (!encryptedText || !password) return null;
    try {
        const encryptedStr = atob(encryptedText);
        const encryptedBytes = new Uint8Array(encryptedStr.length);
        for (let i = 0; i < encryptedStr.length; i++) {
            encryptedBytes[i] = encryptedStr.charCodeAt(i);
        }
        const passwordBytes = textEncoder.encode(password);
        const decryptedBytes = new Uint8Array(encryptedBytes.length);
        for (let i = 0; i < encryptedBytes.length; i++) {
            const keyByte = passwordBytes[i % passwordBytes.length];
            decryptedBytes[i] = encryptedBytes[i] ^ keyByte;
        }
        const decrypted = textDecoder.decode(decryptedBytes);
        // 비밀번호가 틀렸는지 확인 (유효한 텍스트인지 체크)
        if (decrypted && decrypted.length > 0) {
            return decrypted;
        }
        return null;
    } catch (e) {
        console.error('Decryption error:', e);
        return null;
    }
}

// 시간 업데이트 (한국어 형식)
function updateTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours % 12 || 12;
    const timeStr = `${ampm} ${displayHours}:${minutes.toString().padStart(2, '0')}`;
    currentTime.textContent = timeStr;
    if (detailTime) detailTime.textContent = timeStr;
}

// 날짜 업데이트 (한국어)
function updateDate() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    currentMonth.textContent = `${month}월 ${day}일`;
}

// 날짜 형식 변환 (한국어)
function formatDateKorean(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const weekdayShort = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    const weekdayShortText = weekdayShort[date.getDay()];
    
    return {
        badge: day,
        full: `${year}년 ${month}월 ${day}일 ${weekday}`,
        short: `${month}월 ${day}일 (${weekdayShortText})`
    };
}

// 저장된 일기 데이터 가져오기
function getDiaryData() {
    const stored = localStorage.getItem('encryptedDiary');
    if (!stored) return { dates: {} };
    try {
        const data = JSON.parse(stored);
        if (data.dates && typeof data.dates === 'object') {
            return data;
        }
        if (data.encryptedDiary && data.lastSaved) {
            const oldDate = new Date(data.lastSaved).toISOString().split('T')[0];
            return {
                dates: {
                    [oldDate]: {
                        encryptedDiary: data.encryptedDiary,
                        lastSaved: data.lastSaved
                    }
                }
            };
        }
        return { dates: {} };
    } catch (e) {
        console.error('Error parsing diary data:', e);
        return { dates: {} };
    }
}

// 기분 데이터 가져오기
function getMoodData() {
    const stored = localStorage.getItem('moodData');
    if (!stored) return {};
    try {
        return JSON.parse(stored);
    } catch (e) {
        console.error('Error parsing mood data:', e);
        return {};
    }
}

// 기분 데이터 저장
function saveMoodData(dateStr, mood) {
    const moodData = getMoodData();
    moodData[dateStr] = mood;
    try {
        localStorage.setItem('moodData', JSON.stringify(moodData));
    } catch (e) {
        console.error('Error saving mood data:', e);
    }
}

// 날짜별 색상 마커 결정
function getDateMarkerColor(dateStr, index) {
    const colors = ['green', 'orange', 'red', 'blue', 'gray'];
    const hash = dateStr.split('-').reduce((acc, val) => acc + parseInt(val), 0);
    return colors[hash % colors.length];
}

// 달력 그리드 생성
function renderCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    calendarGrid.innerHTML = '';
    
    // 이전 달의 마지막 날짜들
    if (startingDayOfWeek > 0) {
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            const monthStr = (prevMonth + 1).toString().padStart(2, '0');
            const dayStr = day.toString().padStart(2, '0');
            const dateStr = `${prevYear}-${monthStr}-${dayStr}`;
            addCalendarDay(day, dateStr, true, false);
        }
    }
    
    // 현재 달의 날짜들
    const diaryData = getDiaryData();
    for (let day = 1; day <= daysInMonth; day++) {
        const monthStr = (month + 1).toString().padStart(2, '0');
        const dayStr = day.toString().padStart(2, '0');
        const dateStr = `${year}-${monthStr}-${dayStr}`;
        const hasEntry = diaryData.dates[dateStr] !== undefined;
        addCalendarDay(day, dateStr, false, hasEntry);
    }
    
    // 다음 달의 첫 날짜들
    const totalCells = calendarGrid.children.length;
    const remainingCells = 42 - totalCells;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let day = 1; day <= remainingCells; day++) {
        const monthStr = (nextMonth + 1).toString().padStart(2, '0');
        const dayStr = day.toString().padStart(2, '0');
        const dateStr = `${nextYear}-${monthStr}-${dayStr}`;
        addCalendarDay(day, dateStr, true, false);
    }
    
    if (selectedDate) {
        updateEntryCard(selectedDate);
    }
}

function addCalendarDay(day, dateStr, isOtherMonth, hasEntry = false) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    
    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    }
    
    // 일기 쓴 날도 표시하지 않음 (안 쓴 날과 동일하게)
    // if (hasEntry) {
    //     const diaryData = getDiaryData();
    //     const dates = Object.keys(diaryData.dates);
    //     const index = dates.indexOf(dateStr);
    //     const color = getDateMarkerColor(dateStr, index);
    //     dayElement.classList.add('has-entry', color);
    // }
    
    // 지난 날짜인지 확인
    if (!isOtherMonth) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        if (date < today) {
            dayElement.classList.add('is-past');
        }
    }
    
    dayElement.textContent = day;
    
    dayElement.addEventListener('click', () => {
        if (!isOtherMonth) {
            selectDate(dateStr);
        }
    });
    
    calendarGrid.appendChild(dayElement);
}

// 선택된 날짜의 일기 카드 업데이트
function updateEntryCard(dateStr) {
    if (!dateStr) {
        selectedEntryCard.style.display = 'none';
        return;
    }
    
    selectedDate = dateStr;
    const dateInfo = formatDateKorean(dateStr);
    entryDate.textContent = dateInfo.short;
    
    const lockedContent = selectedEntryCard.querySelector('.entry-locked-content');
    if (lockedContent) {
        lockedContent.innerHTML = `
            <span class="lock-icon-small">🔒</span>
            <span class="lock-text-small">비밀번호를 입력하여 내용을 확인하세요</span>
        `;
    }
    
    selectedEntryCard.style.display = 'block';
    selectedEntryCard.onclick = () => {
        handleDateClick(dateStr);
    };
}

function selectDate(dateStr) {
    selectedDate = dateStr;
    updateEntryCard(dateStr);
    renderCalendar();
}

// 날짜 클릭 처리 - 일기 쓰는 창으로 이동
function handleDateClick(dateStr) {
    selectedDate = dateStr;
    showDiaryWriteView(dateStr);
}

// 일기 작성 창 표시
function showDiaryWriteView(dateStr) {
    selectedDate = dateStr;
    const dateInfo = formatDateKorean(dateStr);
    diaryDateDisplay.textContent = `📅 ${dateInfo.full}`;
    
    diaryPasswordInput.value = '';
    diaryTextarea.value = '';
    diaryTextarea.readOnly = true;
    showMessage('', '');
    
    mainView.style.display = 'none';
    detailView.classList.add('active');
    detailView.style.display = 'block';
    currentView = 'detail';
    // 더보기 모달은 닫힌 상태 유지
    menuModal.classList.remove('show');
}

// 메시지 표시
function showMessage(message, type) {
    if (!message) {
        messageArea.textContent = '';
        messageArea.className = 'message-area';
        return;
    }
    
    messageArea.textContent = message;
    messageArea.className = `message-area ${type}`;
    
    if (type === 'success') {
        setTimeout(() => showMessage('', ''), 3000);
    }
}

// 뒤로 가기 버튼 제거됨 (더보기 메뉴가 계속 떠있게 유지)
// document.getElementById('back-btn').addEventListener('click', () => {
//     showMainView();
// });

function showMainView() {
    detailView.classList.remove('active');
    detailView.style.display = 'none';
    calendarView.classList.remove('active');
    calendarView.style.display = 'none';
    mainView.style.display = 'block';
    currentView = 'main';
    renderCalendar();
}

// 해제 버튼 - 비밀번호로 잠금 해제 및 불러오기 (참고문서: 해제 버튼이 불러오기 기능 포함)
unlockBtn.addEventListener('click', async () => {
    const password = diaryPasswordInput.value.trim();
    if (!password) {
        showMessage('⚠️ 비밀번호를 입력해주세요.', 'error');
        return;
    }
    
    // 저장된 일기가 있으면 불러오기 시도
    const diaryData = getDiaryData();
    if (diaryData.dates[selectedDate]) {
        const dateData = diaryData.dates[selectedDate];
        
        // 비밀번호 해시 검증 (저장된 해시가 있는 경우)
        if (dateData.passwordHash) {
            const inputPasswordHash = await simpleHash(password);
            if (inputPasswordHash !== dateData.passwordHash) {
                showMessage('⚠️ 암호가 틀립니다.', 'error');
                return;
            }
        }
        
        // 복호화 시도
        let decrypted;
        try {
            decrypted = decrypt(dateData.encryptedDiary, password);
        } catch (e) {
            showMessage('⚠️ 암호가 틀립니다.', 'error');
            return;
        }
        
        // 복호화 실패 확인
        if (decrypted === null || decrypted === undefined) {
            showMessage('⚠️ 암호가 틀립니다.', 'error');
            return;
        }
        
        // 비밀번호가 맞으면 일기 내용 표시
        diaryTextarea.value = decrypted;
        showMessage('✅ 복호화 성공!', 'success');
    } else {
        // 새 일기인 경우
        showMessage('✅ 일기장이 해제되었습니다.', 'success');
    }
    
    currentPassword = password;
    diaryTextarea.readOnly = false;
    diaryTextarea.placeholder = '일기를 작성하세요...';
});

// 저장 버튼
diarySaveBtn.addEventListener('click', () => {
    const password = diaryPasswordInput.value.trim();
    if (!password) {
        showMessage('⚠️ 비밀번호를 입력해주세요.', 'error');
        return;
    }
    
    const content = diaryTextarea.value.trim();
    if (!content) {
        showMessage('⚠️ 일기 내용을 입력해주세요.', 'error');
        return;
    }
    
    const encrypted = encrypt(content, password);
    if (!encrypted) {
        showMessage('⚠️ 암호화 중 오류가 발생했습니다.', 'error');
        return;
    }
    
    const diaryData = getDiaryData();
    const lines = content.split('\n');
    const title = lines[0] || '제목 없음';
    const bodyText = lines.slice(1).join('\n').trim();
    const preview = bodyText.length > 100 ? bodyText.substring(0, 100) + '...' : bodyText;
    
    // 비밀번호 해시 저장 (검증용)
    simpleHash(password).then(passwordHash => {
        diaryData.dates[selectedDate] = {
            encryptedDiary: encrypted,
            lastSaved: new Date().toISOString(),
            title: title,
            preview: preview || '(내용 없음)',
            passwordHash: passwordHash // 비밀번호 검증용 해시
        };
        
        try {
            localStorage.setItem('encryptedDiary', JSON.stringify(diaryData));
            currentPassword = password;
            
            showMessage('💾 저장 완료', 'success');
            renderCalendar();
        } catch (e) {
            showMessage('⚠️ 저장 중 오류가 발생했습니다.', 'error');
            console.error(e);
        }
    }).catch(e => {
        showMessage('⚠️ 저장 중 오류가 발생했습니다.', 'error');
        console.error(e);
    });
});

// 초기화 버튼
diaryResetBtn.addEventListener('click', () => {
    if (confirm('일기 내용을 초기화하시겠습니까?')) {
        diaryTextarea.value = '';
        diaryPasswordInput.value = '';
        currentPassword = '';
        diaryTextarea.readOnly = true;
        diaryTextarea.placeholder = '일기 작성 영역 — 기본 잠금 상태 🔒';
        showMessage('🔄 초기화되었습니다.', 'success');
    }
});

// 전체 삭제 버튼
deleteAllBtn.addEventListener('click', () => {
    if (confirm('⚠️ 경고: 모든 일기와 비밀번호가 영구적으로 삭제됩니다.\n\n정말로 모든 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
        // localStorage의 모든 일기 데이터 삭제
        localStorage.removeItem('encryptedDiary');
        localStorage.removeItem('moodData');
        
        // 현재 화면 초기화
        diaryTextarea.value = '';
        diaryPasswordInput.value = '';
        currentPassword = '';
        selectedDate = '';
        diaryTextarea.readOnly = true;
        diaryTextarea.placeholder = '일기 작성 영역 — 기본 잠금 상태 🔒';
        
        // 캘린더 및 카드 업데이트
        renderCalendar();
        selectedEntryCard.style.display = 'none';
        
        showMessage('🗑️ 모든 일기와 비밀번호가 삭제되었습니다.', 'success');
        
        // 메인 화면으로 이동
        setTimeout(() => {
            showMainView();
        }, 2000);
    }
});

// 더보기 메뉴 열기/닫기
function openMenuModal() {
    menuModal.classList.add('show');
}

menuBtn.addEventListener('click', openMenuModal);
if (menuBtnDetail) {
    menuBtnDetail.addEventListener('click', openMenuModal);
}
if (menuBtnCalendar) {
    menuBtnCalendar.addEventListener('click', openMenuModal);
}

menuModal.addEventListener('click', (e) => {
    if (e.target === menuModal) {
        menuModal.classList.remove('show');
    }
});

// 캘린더 메뉴 클릭 (😊 웃는 이모지) - 감정 캘린더로
calendarMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // 이벤트 전파 방지
    // 더보기 모달 창은 닫기
    menuModal.classList.remove('show');
    showCalendarView();
});

// 일기 쓰기 메뉴 클릭 (✏️ 연필 이모지) - 일기 쓰기 창으로 (메인 화면)
writeMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // 이벤트 전파 방지
    // 더보기 모달 창은 닫기
    menuModal.classList.remove('show');
    showMainView();
});

// 캘린더 뷰 표시
function showCalendarView() {
    mainView.style.display = 'none';
    detailView.style.display = 'none';
    calendarView.classList.add('active');
    calendarView.style.display = 'block';
    currentView = 'calendar';
    renderMoodCalendar();
    // 더보기 모달은 닫힌 상태 유지
    menuModal.classList.remove('show');
}

// 캘린더 뒤로가기 버튼 제거됨 (더보기 메뉴가 계속 떠있게 유지)
// calendarBackBtn.addEventListener('click', () => {
//     calendarView.classList.remove('active');
//     calendarView.style.display = 'none';
//     mainView.style.display = 'block';
//     currentView = 'main';
//     renderCalendar();
// });

// 월 네비게이션
prevMonthBtn.addEventListener('click', () => {
    currentCalendarMonth--;
    if (currentCalendarMonth < 0) {
        currentCalendarMonth = 11;
        currentCalendarYear--;
    }
    renderMoodCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentCalendarMonth++;
    if (currentCalendarMonth > 11) {
        currentCalendarMonth = 0;
        currentCalendarYear++;
    }
    renderMoodCalendar();
});

// 기분 달력 렌더링
function renderMoodCalendar() {
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월',
        '7월', '8월', '9월', '10월', '11월', '12월'];
    
    calendarMonthYear.textContent = `${monthNames[currentCalendarMonth]} ${currentCalendarYear}`;
    
    const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1);
    const lastDay = new Date(currentCalendarYear, currentCalendarMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    moodCalendarGrid.innerHTML = '';
    
    const prevMonth = new Date(currentCalendarYear, currentCalendarMonth, 0);
    const prevMonthDays = prevMonth.getDate();
    const prevMonthIndex = currentCalendarMonth === 0 ? 11 : currentCalendarMonth - 1;
    const prevYear = currentCalendarMonth === 0 ? currentCalendarYear - 1 : currentCalendarYear;
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const monthStr = String(prevMonthIndex + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${prevYear}-${monthStr}-${dayStr}`;
        addMoodCalendarDay(day, dateStr, true);
    }
    
    const moodData = getMoodData();
    for (let day = 1; day <= daysInMonth; day++) {
        const monthStr = String(currentCalendarMonth + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${currentCalendarYear}-${monthStr}-${dayStr}`;
        const mood = moodData[dateStr];
        addMoodCalendarDay(day, dateStr, false, mood);
    }
    
    const totalCells = moodCalendarGrid.children.length;
    const remainingCells = 42 - totalCells;
    const nextMonthIndex = currentCalendarMonth === 11 ? 0 : currentCalendarMonth + 1;
    const nextYear = currentCalendarMonth === 11 ? currentCalendarYear + 1 : currentCalendarYear;
    for (let day = 1; day <= remainingCells; day++) {
        const monthStr = String(nextMonthIndex + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${nextYear}-${monthStr}-${dayStr}`;
        addMoodCalendarDay(day, dateStr, true);
    }
}

function addMoodCalendarDay(day, dateStr, isOtherMonth, mood = null) {
    const dayElement = document.createElement('div');
    dayElement.className = 'mood-calendar-day';
    
    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    } else {
        // 현재 월의 날짜인 경우, 지난 날짜인지 확인
        const today = new Date();
        const todayYear = today.getFullYear();
        const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
        const todayDay = String(today.getDate()).padStart(2, '0');
        const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;
        
        if (dateStr < todayStr) {
            dayElement.classList.add('past-date');
        }
    }
    
    if (mood) {
        dayElement.classList.add('has-mood');
        dayElement.setAttribute('data-mood', mood);
        dayElement.innerHTML = '';
        const moodSpan = document.createElement('span');
        moodSpan.textContent = mood;
        moodSpan.style.fontSize = '2rem';
        moodSpan.style.lineHeight = '1';
        dayElement.appendChild(moodSpan);
    } else {
        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);
    }
    
    if (!isOtherMonth) {
        dayElement.addEventListener('click', () => {
            selectedMoodDate = dateStr;
            openMoodSelectModal();
        });
    }
    
    moodCalendarGrid.appendChild(dayElement);
}

// 기분 선택 모달 열기
function openMoodSelectModal() {
    const moodData = getMoodData();
    const currentMood = moodData[selectedMoodDate];
    
    moodEmojiBtns.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.mood === currentMood) {
            btn.classList.add('selected');
        }
    });
    
    moodSelectModal.classList.add('show');
}

// 기분 선택 모달 닫기
function closeMoodSelectModal() {
    moodSelectModal.classList.remove('show');
}

closeMoodModalBtn.addEventListener('click', closeMoodSelectModal);
moodSelectModal.addEventListener('click', (e) => {
    if (e.target === moodSelectModal) {
        closeMoodSelectModal();
    }
});

// 기분 이모지 버튼 클릭
moodEmojiBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const mood = btn.dataset.mood;
        saveMoodData(selectedMoodDate, mood);
        
        moodEmojiBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        setTimeout(() => {
            renderMoodCalendar();
            renderCalendar();
            closeMoodSelectModal();
        }, 300);
    });
});

// 초기화 - 오늘 날짜 선택
function initializeApp() {
    const today = new Date().toISOString().split('T')[0];
    selectedDate = today;
    updateEntryCard(today);
}

// 초기화
updateTime();
updateDate();
setInterval(updateTime, 60000);
renderCalendar();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
