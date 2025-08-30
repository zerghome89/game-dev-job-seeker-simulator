const SUPABASE_URL = 'https://nnssmlllzdnubikllrdg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uc3NtbGxsemRudWJpa2xscmRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODA3OTcsImV4cCI6MjA3MTI1Njc5N30.ayPyC8nuEiBwtA4ncoPtGSZFioWnvmB607NtySzdFuw';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class ReignsGame {
    constructor() {
        this.stats = {
            mental: 50,
            finance: 50,
            ability: 30, // 일반 컴과는 취업에 도움되는 것을 배우지 못하는 현실 반영
            confidence: 50,
            health: 50
        };
        
        this.age = 25; // 시작 나이 25살
        this.week = 1; // 주차 (1주씩 증가)
        this.gameOver = false;
        this.currentEvent = null;
        this.gameStarted = false;
        this.recentEvents = []; // 최근 10턴 동안 나온 이벤트 기록
        
        // 엔딩 퀘스트 관련 변수들
        this.endingQuestActive = false; // 엔딩 퀘스트 활성화 여부
        this.endingQuestStep = 0; // 엔딩 퀘스트 단계 (0: 비활성, 1-4: 단계별)
        this.endingQuestResults = []; // 각 단계별 결과 저장
        
        // 최종 엔딩 정보 저장
        this.finalEndingState = null;

        // DOM 요소들
        this.introScreen = document.getElementById('intro-screen');
        this.startButton = document.getElementById('start-button');
        this.eventCard = document.getElementById('event-card');
        this.cardImage = document.getElementById('card-image');
        this.cardTitle = document.getElementById('card-title');
        this.cardDescription = document.getElementById('card-description');
        this.turnCount = document.getElementById('turn-count');
        this.gameStatus = document.getElementById('game-status');
        
        // 결과 창 요소들
        this.resultCard = document.getElementById('result-card');
        this.resultImage = document.getElementById('result-image');
        this.resultTitle = document.getElementById('result-title');
        this.resultMessage = document.getElementById('result-message');
        this.resultStats = document.getElementById('result-stats');
        this.confirmButton = document.getElementById('confirm-button');
        
        this.leftHint = document.getElementById('left-hint');
        this.rightHint = document.getElementById('right-hint');
        
        // 일정 바 요소
        this.scheduleTrack = document.getElementById('schedule-track');
        
        // 스와이프 관련 변수들
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.isDragging = false;
        
        // 음성 관련 변수들
        this.speechSynthesis = window.speechSynthesis;
        this.audioContext = null;
        this.isAudioEnabled = true;
        
        // 배경음악 관련 변수들
        this.backgroundMusic = null;
        this.currentBGM = null;
        this.isBGMEnabled = true;
        
        this.loadAudioSettings();
        this.initializeGame();
        this.setupEventListeners();
        this.initializeAudio();
        this.initializeBackgroundMusic();
    }
    
    initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }
    
    initializeBackgroundMusic() {
        try {
            this.backgroundMusic = {
                normal: new Audio('audio/normal_bgm.mp3'),
                success: new Audio('audio/success_bgm.mp3'),
                failure: new Audio('audio/failure_bgm.mp3')
            };
            Object.values(this.backgroundMusic).forEach(bgm => {
                bgm.loop = true;
                bgm.volume = 0.3;
                bgm.preload = 'auto';
                bgm.muted = false;
            });
            this.bgmInitialized = true;
        } catch (e) {
            console.log('배경음악 초기화 실패:', e);
            this.backgroundMusic = null;
        }
    }
    
    playBackgroundMusic(type) {
        if (!this.isBGMEnabled || !this.backgroundMusic) return;
        this.stopBackgroundMusic();
        if (this.backgroundMusic[type]) {
            this.currentBGM = this.backgroundMusic[type];
            this.currentBGM.currentTime = 0;
            this.currentBGM.play().catch(e => console.log('배경음악 재생 실패:', e));
        }
    }
    
    stopBackgroundMusic() {
        if (this.currentBGM) {
            this.currentBGM.pause();
            this.currentBGM.currentTime = 0;
        }
    }
    
    toggleBackgroundMusic() {
        this.isBGMEnabled = !this.isBGMEnabled;
        if (this.isBGMEnabled) {
            if (this.currentBGM && this.backgroundMusic) {
                this.currentBGM.play().catch(e => console.log('배경음악 재생 실패:', e));
            } else if (this.backgroundMusic) {
                this.playBackgroundMusic('normal');
            }
        } else {
            this.stopBackgroundMusic();
        }
        this.saveAudioSettings();
    }
    
    playCardSwipeSound() {
        if (!this.audioContext || !this.isAudioEnabled) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }
    
    playStatChangeSound(stat, change) {
        if (!this.audioContext || !this.isAudioEnabled) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        const baseFreq = change > 0 ? 600 : 300;
        const endFreq = change > 0 ? 800 : 200;
        oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(endFreq, this.audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }
    
    playGameOverSound(isSuccess = false) {
        if (!this.audioContext || !this.isAudioEnabled) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        if (isSuccess) {
            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.2);
        } else {
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime + 0.2);
        }
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }
    
    toggleAudio() {
        this.isAudioEnabled = !this.isAudioEnabled;
        if (!this.isAudioEnabled) {
            this.speechSynthesis.cancel();
        }
        this.saveAudioSettings();
    }
    
    initializeGame() {
        this.updateStatsDisplay();
        this.initializeScheduleBar();
    }
    
    startGame() {
        this.gameStarted = true;
        this.introScreen.style.display = 'none';
        this.eventCard.style.display = 'block';
        const scheduleBar = document.getElementById('schedule-bar');
        if (scheduleBar) {
            scheduleBar.style.display = 'block';
        }
        if (this.bgmInitialized && this.isBGMEnabled) {
            this.playBackgroundMusic('normal');
        }
        this.clearAllArrows();
        this.loadEvent();
    }
    
    setupEventListeners() {
        this.startButton.addEventListener('click', () => this.startGame());
        
        this.eventCard.addEventListener('mousedown', (e) => {
            if (this.gameStarted && !this.isDragging) this.handleMouseDown(e);
        });
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        this.eventCard.addEventListener('touchstart', (e) => {
            if (this.gameStarted && !this.isDragging) this.handleTouchStart(e);
        }, { passive: false });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        
        const audioToggle = document.getElementById('audio-toggle');
        audioToggle.addEventListener('click', () => {
            this.toggleAudio();
            audioToggle.textContent = this.isAudioEnabled ? '🔊' : '🔇';
            audioToggle.classList.toggle('muted', !this.isAudioEnabled);
        });
        
        const bgmToggle = document.getElementById('bgm-toggle');
        bgmToggle.addEventListener('click', () => {
            this.toggleBackgroundMusic();
            bgmToggle.textContent = this.isBGMEnabled ? '🎵' : '❌';
            bgmToggle.classList.toggle('muted', !this.isBGMEnabled);
        });
        
        audioToggle.textContent = this.isAudioEnabled ? '🔊' : '🔇';
        audioToggle.classList.toggle('muted', !this.isAudioEnabled);
        bgmToggle.textContent = this.isBGMEnabled ? '🎵' : '❌';
        bgmToggle.classList.toggle('muted', !this.isBGMEnabled);
    }
    
    handleMouseDown(e) { this.startDrag(e.clientX, e.clientY); }
    handleMouseMove(e) { if (this.isDragging) this.updateDrag(e.clientX, e.clientY); }
    handleMouseUp(e) { if (this.isDragging) this.endDrag(); }
    
    handleTouchStart(e) {
        if (this.isDragging) return;
        if (e.target.closest('#event-card')) e.preventDefault();
        const touch = e.touches[0];
        this.startDrag(touch.clientX, touch.clientY);
    }
    
    handleTouchMove(e) {
        if (e.target.closest('#event-card') || this.isDragging) e.preventDefault();
        if (this.isDragging) {
            const touch = e.touches[0];
            this.updateDrag(touch.clientX, touch.clientY);
        }
    }
    
    handleTouchEnd(e) {
        if (e.target.closest('#event-card') || this.isDragging) e.preventDefault();
        if (this.isDragging) this.endDrag();
    }
    
    startDrag(x, y) {
        if (!this.gameStarted || this.isDragging) return;
        this.isDragging = true;
        this.startX = x;
        this.startY = y;
        this.currentX = x;
        this.currentY = y;
        this.eventCard.style.cursor = 'grab';
        this.leftHint.classList.remove('visible');
        this.rightHint.classList.remove('visible');
    }
    
    updateDrag(x, y) {
        if (!this.isDragging) return;
        this.currentX = x;
        this.currentY = y;
        const deltaX = this.currentX - this.startX;
        const deltaY = this.currentY - this.startY;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            const translateX = Math.max(-100, Math.min(100, deltaX));
            const rotate = (deltaX / 100) * 5;
            this.eventCard.style.transform = `translateX(${translateX}px) rotate(${rotate}deg)`;
            
            const threshold = 30;
            if (deltaX < -threshold) {
                this.leftHint.classList.add('visible');
                this.rightHint.classList.remove('visible');
                this.updateHintContent('left');
            } else if (deltaX > threshold) {
                this.rightHint.classList.add('visible');
                this.leftHint.classList.remove('visible');
                this.updateHintContent('right');
            } else {
                this.leftHint.classList.remove('visible');
                this.rightHint.classList.remove('visible');
            }
        }
    }
    
    updateHintContent(direction) {
        if (!this.currentEvent) return;
        const effects = this.currentEvent.effects[direction];
        const hintElement = direction === 'left' ? this.leftHint : this.rightHint;
        const sortedStats = Object.entries(effects)
            .filter(([stat, value]) => Math.abs(value) > 0)
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
        
        if (sortedStats.length === 0) {
            hintElement.textContent = this.currentEvent.choices[direction];
            return;
        }
        
        const choiceText = this.currentEvent.choices[direction];
        const statIcons = sortedStats.map(([stat, value]) => {
            const icon = this.getStatIcon(stat);
            return `<span style="margin: 0 2px; font-size: 18px;">${icon}</span>`;
        }).join('');
        
        hintElement.innerHTML = `<div style="text-align: center;"><div style="margin-bottom: 5px; font-size: 14px;">${choiceText}</div><div>${statIcons}</div></div>`;
    }
    
    endDrag() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.eventCard.style.cursor = 'grab';
        this.leftHint.classList.remove('visible');
        this.rightHint.classList.remove('visible');
        
        const deltaX = this.currentX - this.startX;
        const deltaY = this.currentY - this.startY;
        
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            this.makeChoice(deltaX > 0 ? 'right' : 'left');
        } else {
            this.eventCard.style.transform = 'translateX(0) rotate(0deg)';
        }
    }
    
    makeChoice(choice) {
        if (this.gameOver) return;
        this.playCardSwipeSound();
        this.eventCard.classList.add(choice === 'left' ? 'swipe-left' : 'swipe-right');
        
        setTimeout(() => {
            this.applyChoice(choice);
            this.eventCard.classList.remove('swipe-left', 'swipe-right');
            this.eventCard.style.transform = 'translateX(0) rotate(0deg)';
        }, 300);
    }
    
    applyChoice(choice) {
        const effects = this.currentEvent.effects[choice];
        const randomizedEffects = {};
        
        for (const [stat, change] of Object.entries(effects)) {
            const randomFactor = 0.8 + (Math.random() * 0.4);
            const randomizedChange = Math.round(change * randomFactor);
            randomizedEffects[stat] = randomizedChange;
            this.stats[stat] = Math.max(0, Math.min(100, this.stats[stat] + randomizedChange));
        }
        
        if (this.endingQuestActive) {
            this.processEndingQuest(choice);
            return;
        }
        
        this.week++;
        if (this.week > 52) {
            this.age++;
            this.week = 1;
        }

        this.showStatChanges(effects);
        this.updateScheduleBar();
        this.checkGameOverConditions();
        
        if (!this.gameOver) {
            this.showResultCard(choice, randomizedEffects);
        }
    }
    
    processEndingQuest(choice) {
        const success = this.checkEndingQuestSuccess(choice);
        this.endingQuestResults.push({ step: this.endingQuestStep, choice, success });
        
        this.week++;
        if (this.week > 52) {
            this.age++;
            this.week = 1;
        }
        
        const effects = this.currentEvent.effects[choice];
        if (!success) {
            if (this.endingQuestStep === 1) {
                effects.mental = (effects.mental || 0) - 5;
                effects.confidence = (effects.confidence || 0) - 5;
            } else {
                effects.mental = (effects.mental || 0) - 15;
                effects.confidence = (effects.confidence || 0) - 15;
            }
        }
        
        const randomizedEffects = {};
        for (const [stat, change] of Object.entries(effects)) {
            const randomFactor = 0.8 + (Math.random() * 0.4);
            const randomizedChange = Math.round(change * randomFactor);
            randomizedEffects[stat] = randomizedChange;
            this.stats[stat] = Math.max(0, Math.min(100, this.stats[stat] + randomizedChange));
        }
        
        this.showStatChanges(effects);
        this.updateStatsDisplay();
        this.updateScheduleBar();
        this.showEndingQuestStepResult(choice, success, randomizedEffects);
    }
    
    checkEndingQuestSuccess(choice) {
        // 최종 면접 통과 조건
        if ([2, 3, 4].includes(this.endingQuestStep)) {
            if (this.stats.ability >= 90 && this.stats.confidence >= 30 && this.stats.mental >= 30) {
                return true;
            }
        }
        
        const abilityRatio = this.stats.ability / 100;
        const baseSuccessRate = abilityRatio * 0.8;

        let finalSuccessRate = baseSuccessRate;

        if ([2, 3, 4].includes(this.endingQuestStep)) {
            const calculateSuccessPenalty = (statValue) => {
                if (statValue >= 30) {
                    return 0;
                }
                if (statValue >= 15) {
                    // Linear penalty from 0.15 to 0 for stat values from 15 to 30
                    return (30 - statValue) * (0.15 / 15); // which is (30 - statValue) * 0.01
                }
                // Linear penalty from 0.3 to 0.15 for stat values from 0 to 15
                return 0.15 + (15 - statValue) * (0.15 / 15); // which is 0.15 + (15 - statValue) * 0.01
            };

            const mentalPenalty = calculateSuccessPenalty(this.stats.mental);
            const confidencePenalty = calculateSuccessPenalty(this.stats.confidence);
            
            finalSuccessRate = baseSuccessRate - mentalPenalty - confidencePenalty;
        }

        const successConditions = {
            1: choice === 'left',
            2: Math.random() < finalSuccessRate,
            3: Math.random() < finalSuccessRate,
            4: Math.random() < finalSuccessRate
        };
        return successConditions[this.endingQuestStep] || false;
    }
    
    checkFinalEnding() {
        const allSuccess = this.endingQuestResults.every(result => result.success);
        this.showFinalEndingResult(allSuccess);
    }
    
    showFinalEndingResult(allSuccess) {
        if (allSuccess) {
            this.endGame(true);
            return;
        }
        
        this.eventCard.style.display = 'none';
        this.resultCard.style.display = 'block';
        
        const failedSteps = this.endingQuestResults.filter(result => !result.success).length;
        this.resultTitle.textContent = '최종 탈락';
        this.resultMessage.textContent = `${failedSteps}개 단계에서 탈락하여\n최종 합격에 실패했습니다.<br>하지만 포기하지 마세요!`;
        if (this.resultImage) {
            this.resultImage.src = 'images/failure_step.jpg';
            this.resultImage.style.display = 'block';
        }
        
        this.showResultStats({});
        this.confirmButton.onclick = () => this.confirmFinalEndingResult(allSuccess);
    }
    
    confirmFinalEndingResult(allSuccess) {
        this.resultCard.style.display = 'none';
        if (!allSuccess) {
            this.handleEndingQuestFailure();
        }
    }
    
    handleEndingQuestFailure() {
        const firstFailure = this.endingQuestResults.find(result => !result.success);
        
        this.endingQuestActive = false;
        this.endingQuestStep = 0;
        this.endingQuestResults = [];
        
        const recruitmentType = this.week < 44 ? "상반기" : "하반기";
        
        if (firstFailure) {
            const failureMessages = {
                1: `${recruitmentType} 취업시장에 지원하지 않았습니다.`,
                2: `${recruitmentType} 취업시장에서 서류 탈락...<br>하지만 포기하지 마세요!`,
                3: `${recruitmentType} 취업시장에서 1차 면접 탈락...<br>다음 기회를 노려보세요!`,
                4: `${recruitmentType} 취업시장에서 2차 면접 탈락...<br>더 나은 준비를 해보세요!`
            };
            this.gameStatus.innerHTML = failureMessages[firstFailure.step];
        } else {
            // This case should not happen if we are in handleEndingQuestFailure
            this.gameStatus.textContent = "일상으로 돌아갑니다.";
        }
        
        this.updateStatsDisplay();
        this.eventCard.style.display = 'block';
        this.loadEvent();
    }
    
    showStatChanges(effects) {
        document.querySelectorAll('.stat-arrow').forEach(arrow => {
            arrow.textContent = '';
            arrow.className = 'stat-arrow';
        });
        
        for (const [stat, change] of Object.entries(effects)) {
            const arrow = document.getElementById(`${stat}-arrow`);
            const statItem = arrow.parentElement;
            const valueElement = document.getElementById(`${stat}-value`);
            const fillElement = document.getElementById(`${stat}-fill`);
            
            this.playStatChangeSound(stat, change);
            
            if (fillElement) fillElement.style.width = `${this.stats[stat]}%`;
            if (valueElement) {
                valueElement.textContent = this.stats[stat];
                if (change > 0) {
                    valueElement.classList.add('positive-change');
                } else if (change < 0) {
                    valueElement.classList.add('negative-change');
                }
            }
            
            this.updateStatColor(stat, this.stats[stat]);
            
            setTimeout(() => {
                statItem.classList.remove('changed');
                if (valueElement) {
                    valueElement.classList.remove('positive-change', 'negative-change');
                }
            }, 500);
        }
        
        this.turnCount.innerHTML = `${this.age}살<br>(${this.week}주차)`;
        this.updateScheduleBar();
    }
    
    updateStatsDisplay() {
        for (const [stat, value] of Object.entries(this.stats)) {
            const fillElement = document.getElementById(`${stat}-fill`);
            const valueElement = document.getElementById(`${stat}-value`);
            
            if (fillElement && valueElement) {
                fillElement.style.width = `${value}%`;
                valueElement.textContent = value;
                this.updateStatColor(stat, value);
            }
        }
        this.turnCount.innerHTML = `${this.age}살<br>(${this.week}주차)`;
        this.updateScheduleBar();
    }

    updateStatColor(stat, value) {
        const fillElement = document.getElementById(`${stat}-fill`);
        if (fillElement) {
            fillElement.classList.remove('red', 'yellow', 'green');
            if (value < 15) {
                fillElement.classList.add('red');
            } else if (value < 30) {
                fillElement.classList.add('yellow');
            } else {
                fillElement.classList.add('green');
            }
        }
    }
    
    initializeScheduleBar() {
        if (!this.scheduleTrack) return;
        this.scheduleTrack.innerHTML = '';
        for (let week = 1; week <= 52; week++) {
            const marker = document.createElement('div');
            marker.className = 'schedule-marker';
            marker.dataset.week = week;
            marker.style.left = `${((week - 1) / 51) * 100}%`;
            if (week === 22 || week === 44) {
                marker.classList.add('recruitment');
            }
            this.scheduleTrack.appendChild(marker);
        }
        this.updateScheduleBar();
    }
    
    updateScheduleBar() {
        if (!this.scheduleTrack) return;
        this.scheduleTrack.querySelectorAll('.schedule-marker').forEach(m => m.classList.remove('current'));
        const weekToShow = this.week > 52 ? 52 : this.week;
        const currentMarker = this.scheduleTrack.querySelector(`[data-week="${weekToShow}"]`);
        if (currentMarker) currentMarker.classList.add('current');
    }
    
    checkGameOverConditions(isSuccessEnding) {
        for (const [stat, value] of Object.entries(this.stats)) {
            if (value <= 0) {
                this.endGame(isSuccessEnding, stat, value);
                return;
            }
        }
        
        if (isSuccessEnding) {
            endGame(isSuccessEnding);
        }
    }
    
    
    startEndingQuest() {
        this.endingQuestActive = true;
        this.endingQuestStep = 1;
        this.endingQuestResults = [];
        const recruitmentType = this.week < 44 ? "상반기" : "하반기";
        this.gameStatus.innerHTML = `${recruitmentType} 취업시장 시작!<br><small>'역량'이 중요하며, '정신력', '자신감'이 낮으면 페널티가 있습니다.</small>`;
        this.loadEndingQuestEvent();
    }
    
    endGame(isSuccessEnding, stat, value) {
        if (this.gameOver) return; // 이미 처리된 경우 중복 실행 방지
        this.gameOver = true;
        
        let message = '';
        let title = '';
        let isSuccess = false;
        let endingImage = '';
        
        if (this.endingQuestActive && isSuccessEnding) {
            title = '취업 성공! 🎉';
            message = '모든 단계를 성공적으로 통과하여 게임회사에 최종 합격했습니다!';
            endingImage = 'images/success.jpg';
            isSuccess = true;
            this.playBackgroundMusic('success');
        } else {
            const endings = {
                mental: { title: '번아웃', message: '정신력이 완전히 고갈되어 번아웃이 되었습니다.', image: 'images/burnout.jpg' },
                finance: { title: '파산', message: '재정이 바닥나서 파산했습니다.', image: 'images/beggar.jpg' },
                confidence: { title: '우울증', message: '자신감이 완전히 사라져 우울증에 걸렸습니다.', image: 'images/burnout.jpg' },
                health: { title: '병원', message: '체력이 완전히 고갈되어 병원에 입원했습니다.', image: 'images/hospital.jpg' }
            };
            const ending = endings[stat] || { title: '게임 오버', message: `${this.getStatName(stat)}이(가) 0이 되어 게임이 끝났습니다.`, image: 'images/burnout.jpg' };
            
            title = ending.title;
            message = ending.message;
            endingImage = ending.image;
            isSuccess = false;
            this.playBackgroundMusic('failure');
        }
        
        this.playGameOverSound(isSuccess);
        
        // 최종 엔딩 상태 저장
        this.finalEndingState = { title, message, endingImage, isSuccess };

        // 점수 계산 및 이름 입력 모달 표시
        this.calculateAndShowScoreModal(isSuccess);
    }

    calculateAndShowScoreModal(isSuccess) {
        const totalStats = Object.values(this.stats).reduce((sum, stat) => sum + stat, 0);
        const weekPenalty = this.week * 5;
        const successBonus = isSuccess ? 500 : 0;
        const finalScore = totalStats * 2 - weekPenalty + successBonus;

        // 이름 입력 모달 표시
        showNameInputModal(finalScore, this); // gameInstance를 직접 전달
    }
    
    displayFinalScreen() {
        if (!this.finalEndingState) return;

        const { title, message, endingImage, isSuccess } = this.finalEndingState;

        this.resultCard.style.display = 'none';
        this.eventCard.style.display = 'block';
        
        if (endingImage) {
            this.cardImage.src = endingImage;
            this.cardImage.style.display = 'block';
            this.cardImage.className = 'card-image ending ' + (isSuccess ? 'success' : 'failure');
        } else {
            this.cardImage.style.display = 'none';
        }
        
        this.gameStatus.textContent = message;
        this.cardTitle.textContent = title;
        this.cardDescription.textContent = `${this.age}살 ${this.week}주차에서 게임이 종료되었습니다.`;
        
        this.leftHint.innerHTML = `<div style="text-align: center;">플레이 해주셔서 감사합니다.</div>`;
        this.rightHint.innerHTML = `<div style="text-align: center;">플레이 해주셔서 감사합니다.</div>`;
        this.leftHint.classList.add('visible', 'choice-button');
        this.rightHint.classList.add('visible', 'choice-button');

        // 기존 스와이프 이벤트 리스너 제거
        // (새 게임 시작 시 다시 설정되므로 여기서는 간단히 비워둠)
        this.eventCard.onclick = (e) => {
            const rect = this.eventCard.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            
            window.location.reload();
        };
    }

    getStatName(stat) {
        const names = { mental: '정신력', finance: '재정', ability: '역량', confidence: '자신감', health: '체력' };
        return names[stat] || stat;
    }
    
    getStatIcon(stat) {
        const icons = { mental: '🧠', finance: '💰', ability: '⚡', confidence: '💪', health: '❤️' };
        return icons[stat] || '❓';
    }
    
    restartGame() {
        window.location.reload();
    }
    
    clearAllArrows() {
        document.querySelectorAll('.stat-arrow').forEach(arrow => {
            arrow.textContent = '';
            arrow.className = 'stat-arrow';
        });
        document.querySelectorAll('.stat-item').forEach(item => {
            item.classList.remove('changed', 'danger');
        });
    }
    
    loadEvent() {
        
        // 공채 시즌 (22주, 44주)에 특별 이벤트 발생
        const isRecruitmentSeason = this.week === 22 || this.week === 44;
        if (isRecruitmentSeason && !this.endingQuestActive) {             
            this.startEndingQuest();                                      
            return;                                                       
        }  
 
        if (this.endingQuestActive) {
            this.loadEndingQuestEvent();
            return;
        }
        
        const events = [
            {
                title: "포트폴리오 제작",
                description: "게임 포트폴리오를 만들까 고민이 됩니다.\n어떻게 하시겠습니까?",
                image: "images/portfolio.jpg",
                prob: 1,
                choices: {
                    left: "제작한다.",
                    right: "다음 기회로 미룬다."
                },
                effects: {
                    left: { ability: 2, mental: -4, finance: -2 },
                    right: { ability: -2, mental: 3 }
                },
                resultMessages: {
                    left: "포트폴리오 제작을 시작합니다. 실력이 한 단계 성장하는 계기가 될 것입니다.",
                    right: "지금은 때가 아닌 것 같습니다. 휴식을 취하며 다음 기회를 노립니다."
                }
            },
            {
                title: "온라인 강의",
                description: "게임 개발 온라인 강의를 들을 기회가 있습니다.\n어떻게 하시겠습니까?",
                image: "images/online.jpg",
                prob: 1,
                choices: {
                    left: "고급 강의를 수강한다.",
                    right: "무료 강의를 수강한다."
                },
                effects: {
                    left: { ability: 4, finance: -4, mental: -2 },
                    right: { ability: 2 }
                },
                resultMessages: {
                    left: "비용은 들지만, 확실한 실력 향상을 위해 고급 강의를 듣습니다.",
                    right: "무료 강의를 통해 핵심만 빠르게 습득합니다."
                }
            },
            {
                title: "개인 프로젝트",
                description: "개인 게임 프로젝트를 시작할 수 있습니다.\n어떻게 하시겠습니까?",
                image: "images/portfolio.jpg",
                prob: 1,
                choices: {
                    left: "대규모 프로젝트",
                    right: "간단한 프로젝트"
                },
                effects: {
                    left: { ability: 4, confidence: 2, health: -4 },
                    right: { ability: 2, mental: 1 }
                },
                resultMessages: {
                    left: "큰 도전을 통해 많은 것을 배우기로 합니다. 힘들겠지만, 그만큼 얻는 것도 많을 겁니다.",
                    right: "작고 빠르게 완성할 수 있는 프로젝트를 통해 성취감을 얻습니다."
                }
            },
            {
                title: "알바 제안",
                description: "생활비를 벌기 위한 알바 제안이 들어왔습니다.\n어떻게 하시겠습니까?",
                image: "images/money.jpg",
                prob: 2,
                choices: {
                    left: "아르바이트를 한다.",
                    right: "아르바이트를 하지 않는다."
                },
                effects: {
                    left: { finance: 8, mental: -3, ability: -3, health: -1 },
                    right: { finance: -3, mental: 2 }
                },
                resultMessages: {
                    left: "개발 공부도 중요하지만, 일단은 먹고 살아야 합니다.",
                    right: "당장의 돈보다는 미래를 위한 투자를 선택합니다."
                }
            },
            {
                title: "면접 연습",
                description: "게임 회사 면접을 위한 모의 면접을 연습할 수 있습니다.\n어떻게 하시겠습니까?",
                image: "images/interview.jpg",
                prob: 0.5,
                choices: {
                    left: "전문가와 연습한다.",
                    right: "혼자 연습한다."
                },
                effects: {
                    left: { confidence: 4, mental: -3, ability: 2 },
                    right: { confidence: 2, ability: 1 }
                },
                resultMessages: {
                    left: "전문가의 도움을 받아 실전처럼 면접을 준비합니다.",
                    right: "혼자서 예상 질문에 답변하며 자신감을 키웁니다."
                }
            },
            {
                title: "게임취업밤 게임잼 참가",
                description: "게임잼에 참가하여 실력을 키울 수 있습니다.\n어떻게 하시겠습니까?",
                image: "images/portfolio.jpg",
                prob: 1,
                choices: {
                    left: "팀으로 참가한다.",
                    right: "개인으로 참가한다."
                },
                effects: {
                    left: { ability: 4, mental: -5, confidence: 3 },
                    right: { ability: 2 }
                },
                resultMessages: {
                    left: "다른 사람들과 협업하며 시야를 넓히는 기회를 갖습니다.",
                    right: "오롯이 내 아이디어로 게임을 만들어봅니다."
                }
            },
            {
                title: "운동 시간",
                description: "체력을 기르기 위한 운동을 할 수 있습니다.\n어떻게 하시겠습니까?",
                image: "images/health.jpg",
                prob: 2,
                choices: {
                    left: "격렬한 운동",
                    right: "가벼운 운동"
                },
                effects: {
                    left: { health: 5, mental: -2 },
                    right: { health: 3, mental: 1 }
                },
                resultMessages: {
                    left: "땀을 흘리며 체력을 단련합니다. 건강한 신체에 건강한 정신이 깃듭니다.",
                    right: "가벼운 산책으로 머리를 식히고 건강도 챙깁니다."
                }
            },
            {
                title: "친구와의 만남",
                description: "친구들과 만나서 스트레스를 해소할 수 있습니다.\n어떻게 하시겠습니까?",
                image: "images/cafe.jpg",
                prob: 1,
                choices: {
                    left: "친구들과 만난다.",
                    right: "혼자 시간을 보낸다."
                },
                effects: {
                    left: { mental: 5, finance: -3 },
                    right: { mental: 2 }
                },
                resultMessages: {
                    left: "친구들과 즐거운 시간을 보내며 재충전합니다.",
                    right: "혼자 조용히 시간을 보내며 생각을 정리합니다."
                }
            },
            {
                title: "멘토링",
                description: "게임 업계 선배와 멘토링을 받을 수 있습니다.\n어떻게 하시겠습니까?",
                image: "images/mentoring.jpg",
                prob: 0.5,
                choices: {
                    left: "고급 멘토링",
                    right: "무료 멘토링"
                },
                effects: {
                    left: { ability: 4, confidence: 4, finance: -6 },
                    right: { ability: 2, confidence: 2 }
                },
                resultMessages: {
                    left: "현직자의 값진 조언을 얻기 위해 비용을 투자합니다.",
                    right: "무료 멘토링을 통해 가볍게 조언을 구합니다."
                }
            },
            {
                title: "팀 프로젝트",
                description: "팀 프로젝트에 참여할 기회가 있습니다.\n어떻게 하시겠습니까?",
                image: "images/team_project.jpg",
                prob: 0.8,
                choices: {
                    left: "팀장으로 참여",
                    right: "팀원으로 참여"
                },
                effects: {
                    left: { ability: 4, confidence: 5, mental: -4, health: -2 },
                    right: { ability: 2, mental: -2 }
                },
                resultMessages: {
                    left: "프로젝트를 이끌며 리더십과 책임감을 기릅니다.",
                    right: "팀의 일원으로서 협업 능력과 실무 경험을 쌓습니다."
                }
            },
            {
                title: "전공 서적 독서",
                description: "게임 개발 관련 서적을 읽을 수 있습니다.\n어떻게 하시겠습니까?",
                image: "images/book.jpg",
                prob: 1,
                choices: {
                    left: "고급 서적 읽기",
                    right: "기초 서적 읽기"
                },
                effects: {
                    left: { ability: 2, mental: -2 },
                    right: { ability: 1, mental: 1 }
                },
                resultMessages: {
                    left: "깊이 있는 지식을 탐구하며 전문성을 높입니다.",
                    right: "기본기를 탄탄히 다지는 시간을 갖습니다."
                }
            },
            {
                title: "국내 여행",
                description: "짧은 여행을 통해 스트레스를 해소할 수 있습니다.\n어떻게 하시겠습니까?",
                image: "images/korea.jpg",
                prob: 0.5,
                choices: {
                    left: "여행 가기",
                    right: "집에 머물기"
                },
                effects: {
                    left: { mental: 7, health: 3, finance: -5 },
                    right: { mental: 2 }
                },
                resultMessages: {
                    left: "새로운 풍경을 보며 스트레스를 풀고 활력을 얻습니다.",
                    right: "집에서 편안하게 휴식을 취하며 에너지를 충전합니다."
                }
            },
            {
                title: "예상치 못한 칭찬",
                description: "코딩한 결과물을 보고 가족이 칭찬해줍니다.\n어떻게 하시겠습니까?",
                image: "images/compliment.jpg",
                prob: 0.5,
                choices: {
                    left: "겸손하게 받는다",
                    right: "자랑한다"
                },
                effects: {
                    left: { mental: 3 },
                    right: { confidence: 3 }
                },
                resultMessages: {
                    left: "따뜻한 위로를 받았습니다.",
                    right: "자신감이 크게 올라갔습니다."
                }
            },
            {
                title: "낮잠 유혹",
                description: "점심을 먹고 졸음이 쏟아집니다.\n어떻게 하시겠습니까?",
                image: "images/sleepy.jpg",
                prob: 1,
                choices: {
                    left: "잠깐 잔다.",
                    right: "참고 공부한다."
                },
                effects: {
                    left: { health: 2, mental: 2 },
                    right: { ability: 1, health: -1, mental: -1 }
                },
                resultMessages: {
                    left: "개운하게 깨어났습니다.",
                    right: "졸음에 시달렸지만 공부를 이어갔습니다."
                }
            },
            {
                title: "집중력 저하",
                description: "집이 답답해 근처 카페에서 공부할까 고민됩니다.\n어떻게 하시겠습니까?",
                image: "images/trouble_focusing.jpg",
                prob: 1,
                choices: {
                    left: "카페로 간다.",
                    right: "집에 남는다."
                },
                effects: {
                    left: { ability: 2, mental: 2, finance: -2 },
                    right: { ability: 1, mental: -1 }
                },
                resultMessages: {
                    left: "새로운 분위기에서 집중력이 향상되었습니다.",
                    right: "정신을 차리고 공부를 이어갔습니다."
                }
            },
            {
                title: "게임취업밤 디스코드 강의",
                description: "게임취업밤 디스코드 강의가 있습니다.\n어떻게 하시겠습니까?",
                image: "images/discord.jpg",
                prob: 1,
                choices: {
                    left: "강의를 청취한다.",
                    right: "혼자서 공부한다."
                },
                effects: {
                    left: { ability: 3 },
                    right: { ability: -1 }
                },
                resultMessages: {
                    left: "유익한 내용이 많아 역량이 크게 상승했습니다.",
                    right: "혼자 공부를 했지만 크게 효과가 있지는 않았습니다."
                }
            },
            {
                title: "서점 신간 발견",
                description: "개발 관련 신간이 눈에 띕니다.\n어떻게 하시겠습니까?",
                image: "images/bookstore.jpg",
                prob: 1,
                choices: {
                    left: "구매한다.",
                    right: "외면한다."
                },
                effects: {
                    left: { ability: 2, finance: -2 },
                    right: { mental: -1 }
                },
                resultMessages: {
                    left: "책에서 좋은 정보를 얻었습니다.",
                    right: "지출을 줄였지만 눈에 자꾸 아른거립니다."
                }
            },
            {
                title: "비상금 발견",
                description: "책상 서랍에서 잊고 있던 돈을 발견했습니다.\n어떻게 하시겠습니까?",
                image: "images/emergency_fund.jpg",
                prob: 1,
                choices: {
                    left: "간식을 사먹는다.",
                    right: "저축을 한다."
                },
                effects: {
                    left: { mental: 2 },
                    right: { mental: -1, finance: 2 }
                },
                resultMessages: {
                    left: "맛있는 간식으로 기분이 좋아졌습니다.",
                    right: "통장에 소소한 여유가 생겼습니다."
                }
            },
            {
                title: "합격한 친구의 소식",
                description: "같이 준비하던 친구가 먼저 좋은 회사에 합격했다는 소식을 전해왔습니다.\n어떻게 하시겠습니까?",
                image: "images/friend_success.jpg",
                prob: 1,
                choices: {
                    left: "진심으로 축하해준다.",
                    right: "부러운 마음에 거리를 둔다."
                },
                effects: {
                    left: { mental: 2, confidence: -2 },
                    right: { mental: -2 }
                },
                resultMessages: {
                    left: "친구를 축하해주니 마음은 편해졌지만, 한편으로 드는 초조함은 어쩔 수 없습니다.",
                    right: "비교하는 마음이 나를 더 힘들게 합니다. 정신력이 크게 하락했습니다."
                }
            },
            {
                title: "창의력 고갈",
                description: "새로운 아이디어를 내야 하는데, 아무 생각도 떠오르지 않습니다.\n어떻게 하시겠습니까?",
                image: "images/trouble_focusing.jpg",
                prob: 1,
                choices: {
                    left: "좋아하는 게임을 플레이한다.",
                    right: "다른 사람의 작품을 참고한다."
                },
                effects: {
                    left: { mental: 3, health: -2, ability: 1 },
                    right: { ability: 2, mental: -3 }
                },
                resultMessages: {
                    left: "즐겁게 게임을 하며 새로운 영감을 얻었습니다! 하지만 눈은 조금 피곤합니다.",
                    right: "다양한 레퍼런스를 찾아보며 시야를 넓혔지만, 독창성에 대한 고민이 깊어졌습니다."
                }
            },
            {
                title: "예상치 못한 용돈",
                description: "부모님께서 고생한다며 예상치 못한 용돈을 주셨습니다.\n어떻게 하시겠습니까?",
                image: "images/pocket_money.jpg",
                prob: 0.5,
                choices: {
                    left: "감사히 받고 생활비에 보탠다.",
                    right: "마음만 받겠다며 정중히 거절한다."
                },
                effects: {
                    left: { finance: 4, mental: 1 },
                    right: { confidence: 7, mental: -2 }
                },
                resultMessages: {
                    left: "재정적 여유가 생기니 마음의 여유도 함께 찾아왔습니다.",
                    right: "스스로의 힘으로 해내고 싶다는 마음을 보여드렸습니다. 자신감은 올랐지만, 현실적인 걱정이 앞섭니다."
                }
            },
            {
                title: "발표 직전 발견한 버그",
                description: "포트폴리오 시연 면접을 하루 앞두고, 프로젝트에서 치명적인 버그를 발견했습니다.\n어떻게 하시겠습니까?",
                image: "images/bug.jpg",
                prob: 1,
                choices: {
                    left: "밤샘 작업을 통해 빠르게 수정한다.",
                    right: "솔직하게 상황을 설명하고 양해를 구한다."
                },
                effects: {
                    left: { ability: 2, mental: -2, health: -4 },
                    right: { confidence: 4, ability: -2 }
                },
                resultMessages: {
                    left: "엄청난 집중력으로 버그를 잡아냈습니다! 위기 대처 능력을 증명했지만 체력 및 정신적으로 녹초가 되었습니다.",
                    right: "진솔한 태도를 좋게 평가받았습니다. 기술적인 아쉬움은 남았지만, 신뢰를 얻었습니다."
                }
            },
            {
                title: "개발자 블로그 작성",
                description: "공부한 내용을 정리하고 공유하기 위해 기술 블로그를 작성할까 고민됩니다.\n어떻게 하시겠습니까?",
                image: "images/blog.jpg",
                prob: 1,
                choices: {
                    left: "꾸준히 기록한다.",
                    right: "글 쓸 시간에 하나라도 더 공부한다."
                },
                effects: {
                    left: { ability: 1, confidence: 2, mental: -2, health: -1 },
                    right: { ability: 2 }
                },
                resultMessages: {
                    left: "글을 쓰는 것은 생각보다 힘든 일이었지만, 지식이 완벽히 내 것이 되는 기분입니다.",
                    right: "블로그보다는 코딩에 집중하여, 안정적으로 역량을 향상시켰습니다."
                }
            },
            {
                title: "내 아이디어가 이미 존재한다니",
                description: "혁신적이라고 생각했던 나만의 게임 아이디어가 이미 다른 게임으로 출시된 것을 발견했습니다.\n어떻게 하시겠습니까?",
                image: "images/embarrassment.jpg",
                prob: 0.3,
                choices: {
                    left: "내 아이디어에 차별점을 더해 발전시킨다.",
                    right: "아이디어를 폐기하고 새로 구상한다."
                },
                effects: {
                    left: { ability: 4, mental: -2, health: -2 },
                    right: { ability: -2, mental: -2 }
                },
                resultMessages: {
                    left: "좌절하지 않고 기존 아이디어를 뛰어넘기 위해 노력했습니다. 역량이 크게 향상되었습니다.",
                    right: "허탈함에 모든 것을 처음부터 다시 시작해야 합니다. 시간과 정신적 타격이 큽니다."
                }
            },
            {
                title: "올라버린 월세",
                description: "집주인에게서 다음 달부터 월세를 올리겠다는 통보를 받았습니다.\n어떻게 하시겠습니까?",
                image: "images/rent_increase.jpg",
                prob: 0.3,
                choices: {
                    left: "생활비를 극단적으로 줄인다.",
                    right: "단기 아르바이트를 알아본다."
                },
                effects: {
                    left: { finance: -1, mental: -2, health: -1 },
                    right: { ability: -3, finance: +6, mental: +2 }
                },
                resultMessages: {
                    left: "허리띠를 졸라맸습니다. 돈은 아꼈지만, 삶의 질이 떨어져 스트레스가 극심합니다.",
                    right: "급한 불은 껐지만, 공부할 시간이 줄어들어 초조한 마음이 더욱 커졌습니다."
                }
            },
            {
                title: "이거 하나만 만들어 줘",
                description: "개발자가 아닌 친구가 '너는 전문가니까 쉽지?'라며 자신의 사업에 필요한 앱/웹을 거의 무료로 만들어달라고 부탁합니다.\n어떻게 하시겠습니까?",
                image: "images/friend_request.jpg",
                prob: 0.5,
                choices: {
                    left: "우정을 위해 도와준다.",
                    right: "정당한 대가를 요구하거나 거절한다."
                },
                effects: {
                    left: { ability: -10, finance: +2, mental: -2 },
                    right: { confidence: +2, mental: +2 }
                },
                resultMessages: {
                    left: "내 소중한 시간과 노력을 쏟아부었지만, 남은 것은 피로뿐입니다. 취업 준비에 큰 차질이 생겼습니다.",
                    right: "나의 가치를 스스로 지켰습니다. 불편한 관계가 될 수도 있지만, 장기적으로는 현명한 선택입니다."
                }
            },
            {
                title: "신입(경력 5년) 채용 공고",
                description: "신입 개발자를 뽑는 공고인데, 자격 요건에는 '관련 경력 5년 이상'이라는 어이없는 내용이 적혀 있습니다.\n어떻게 하시겠습니까?",
                image: "images/embarrassment.jpg",
                prob: 0.5,
                choices: {
                    left: "황당해하며 커뮤니티에 공유한다.",
                    right: "조용히 창을 닫는다."
                },
                effects: {
                    left: { mental: 4 },
                    right: { mental: -2 }
                },
                resultMessages: {
                    left: "다른 사람들과 웃고 떠들며 스트레스를 풀었습니다. 나만 힘든 게 아니었습니다.",
                    right: "씁쓸한 업계의 현실을 또 한 번 마주했습니다. 정신력이 하락했습니다."
                }
            },
        ];
        
        let availableEvents = events.filter(event => !this.recentEvents.includes(event.title));
        if (availableEvents.length === 0) {
            this.recentEvents = [];
            availableEvents = events;
        }
        
        this.currentEvent = this.selectEventByProbability(availableEvents);
        this.recentEvents.push(this.currentEvent.title);
        if (this.recentEvents.length > 10) this.recentEvents.shift();
        
        this.cardImage.src = this.currentEvent.image || '';
        this.cardImage.style.display = this.currentEvent.image ? 'block' : 'none';
        this.cardImage.classList.remove('ending', 'success', 'failure');
        this.cardTitle.textContent = this.currentEvent.title;
        this.cardDescription.textContent = this.currentEvent.description;
        this.leftHint.textContent = this.currentEvent.choices.left;
        this.rightHint.textContent = this.currentEvent.choices.right;
    }
    
    selectEventByProbability(events) {
        const weights = [];
        let totalWeight = 0;
        for (const event of events) {
            const prob = event.prob || 1;
            totalWeight += prob;
            weights.push(totalWeight);
        }
        const random = Math.random() * totalWeight;
        for (let i = 0; i < weights.length; i++) {
            if (random < weights[i]) return events[i];
        }
        return events[events.length - 1];
    }
    
    loadEndingQuestEvent() {
        const endingEvents = [
            {
                step: 1,
                title: "게임회사 지원 결정",
                description: "이제 게임회사에 지원할 준비가 되었습니다. 지원하시겠습니까?",
                image: "images/apply.jpg",
                choices: {
                    left: "지원한다",
                    right: "지원 안한다"
                },
                effects: {
                    left: {  },
                    right: {  }
                }
            },
            {
                step: 2,
                title: "서류 평가",
                description: "지원서를 작성해야 합니다.\n어떤 방식으로 작성하시겠습니까?",
                image: "images/resume.jpg",
                choices: {
                    left: "밤 늦게까지 준비하여 작성한다.",
                    right: "무리하지 않는다."
                },
                effects: {
                    left: { ability: 2, health: -2 },
                    right: { mental: 2 }
                }
            },
            {
                step: 3,
                title: "1차 면접",
                description: "내일이 1차 면접이 입니다.\n어떻게 하시겠습니까?",
                image: "images/1st_interview.jpg",
                choices: {
                    left: "밤 늦게까지 준비한다.",
                    right: "무리하지 않는다."
                },
                effects: {
                    left: { ability: 2, health: -2 },
                    right: { mental: 2 }
                }
            },
            {
                step: 4,
                title: "2차 면접",
                description: "최종 2차 면접입니다. 이번이 마지막 기회입니다!",
                image: "images/2nd_interview.jpg",
                choices: {
                    left: "밤 늦게까지 준비한다.",
                    right: "무리하지 않는다."
                },
                effects: {
                    left: { ability: 2, health: -2 },
                    right: { mental: 2 }
                }
            }
        ];
        
        this.currentEvent = endingEvents.find(event => event.step === this.endingQuestStep);
        if (!this.currentEvent) return;
        
        this.cardImage.src = this.currentEvent.image || '';
        this.cardImage.style.display = this.currentEvent.image ? 'block' : 'none';
        this.cardTitle.textContent = this.currentEvent.title;
        this.cardDescription.textContent = this.currentEvent.description;
        this.leftHint.textContent = this.currentEvent.choices.left;
        this.rightHint.textContent = this.currentEvent.choices.right;
    }
    
    showResultCard(choice, effects) {
        if (this.gameOver) return;
        this.eventCard.style.display = 'none';
        this.resultCard.style.display = 'block';
        this.resultTitle.textContent = this.currentEvent.title;
        this.resultMessage.textContent = this.getResultMessage(choice);
        this.showResultStats(effects);
        this.confirmButton.onclick = () => this.confirmResult();
    }
    
    getResultMessage(choice) {
        if (this.currentEvent && this.currentEvent.resultMessages) {
            return this.currentEvent.resultMessages[choice];
        }
        return choice === 'left' ? "좌측 선택을 했습니다." : "우측 선택을 했습니다.";
    }
    
    showResultStats(effects) {
        this.resultStats.innerHTML = '';
        for (const [stat, change] of Object.entries(effects)) {
            if (change !== 0) {
                const statItem = document.createElement('div');
                statItem.className = 'result-stat-item';
                statItem.innerHTML = `<span class="result-stat-icon">${this.getStatIcon(stat)}</span>
                                      <span class="result-stat-value ${change > 0 ? 'positive' : 'negative'}">${change > 0 ? '+' : ''}${change}</span>
                                      <span>${this.getStatName(stat)}</span>`;
                this.resultStats.appendChild(statItem);
            }
        }
    }
    
    confirmResult() {
        this.resultCard.style.display = 'none';
        if (!this.gameOver) {
            this.checkGameOverConditions();
            if (!this.gameOver) {
                this.eventCard.style.display = 'block';
                this.loadEvent();
            }
        }
    }

    showEndingQuestStepResult(choice, success, randomizedEffects) {
        this.eventCard.style.display = 'none';
        this.resultCard.style.display = 'block';
        
        const stepMessages = {
            1: { success: "게임회사 지원을 결정했습니다!\n지원서 작성 단계로 넘어갑니다.", failure: "지원을 포기했습니다.\n일상으로 돌아갑니다." },
            2: { success: "서류 평가를 통과했습니다!\n1차 면접으로 진행합니다.", failure: "서류 평가에서 탈락했습니다.\n일상으로 돌아갑니다." },
            3: { success: "1차 면접을 통과했습니다!\n최종 2차 면접으로 진행합니다.", failure: "1차 면접에서 탈락했습니다.\n일상으로 돌아갑니다." },
            4: { success: "2차 면접을 통과했습니다!\n최종 합격을 기다립니다.", failure: "2차 면접에서 탈락했습니다.\n일상으로 돌아갑니다." }
        };
        const stepNames = { 1: "지원 결정", 2: "서류 평가", 3: "1차 면접", 4: "2차 면접" };
        
        this.resultTitle.textContent = `${stepNames[this.endingQuestStep]} ${success ? '성공' : '실패'}`;
        this.resultMessage.textContent = stepMessages[this.endingQuestStep][success ? 'success' : 'failure'];
        
        this.showResultStats(randomizedEffects);
        this.confirmButton.onclick = () => this.confirmEndingQuestStepResult(success);
    }
    
    confirmEndingQuestStepResult(success) {
        this.resultCard.style.display = 'none';
        if (success) {
            this.endingQuestStep++;
            if (this.endingQuestStep > 4) {
                this.checkFinalEnding();
            } else {
                this.eventCard.style.display = 'block';
                this.loadEndingQuestEvent();
            }
        } else {
            this.handleEndingQuestFailure();
        }
    }
    
    loadAudioSettings() {
        try {
            const savedAudioEnabled = localStorage.getItem('gameAudioEnabled');
            const savedBGMEnabled = localStorage.getItem('gameBGMEnabled');
            if (savedAudioEnabled !== null) this.isAudioEnabled = savedAudioEnabled === 'true';
            if (savedBGMEnabled !== null) this.isBGMEnabled = savedBGMEnabled === 'true';
        } catch (e) {
            console.log('음소거 설정 복구 실패:', e);
        }
    }
    
    saveAudioSettings() {
        try {
            localStorage.setItem('gameAudioEnabled', this.isAudioEnabled.toString());
            localStorage.setItem('gameBGMEnabled', this.isBGMEnabled.toString());
        } catch (e) {
            console.log('음소거 설정 저장 실패:', e);
        }
    }
}

// --- Global Scope ---
let gameInstance = null;
let lastSubmittedScoreId = null; // 마지막으로 등록된 점수의 ID 저장

document.addEventListener('DOMContentLoaded', () => {
    gameInstance = new ReignsGame();
});

// 리더보드 관련 기능
const leaderboardButton = document.getElementById('leaderboard-button');
const leaderboardModalOverlay = document.getElementById('leaderboard-modal-overlay');
const closeLeaderboardButton = document.getElementById('close-leaderboard-button');
const leaderboardList = document.getElementById('leaderboard-list');

leaderboardButton.addEventListener('click', () => {
    showLeaderboard();
});

closeLeaderboardButton.addEventListener('click', () => {
    leaderboardModalOverlay.style.display = 'none';
    // 리더보드를 닫은 후 최종 엔딩 화면 표시
    if (gameInstance && gameInstance.gameOver) {
        gameInstance.displayFinalScreen();
    }
});

async function showLeaderboard() {
    try {
        const { data, error } = await supabaseClient
            .from('score')
            .select('name, score')
            .order('score', { ascending: false })
            .limit(100);

        if (error) {
            throw error;
        }

        if (data && data.length > 0) {
            leaderboardList.innerHTML = data.map((entry, index) => 
                `<li><span class="rank">${index + 1}.</span><span class="name">${entry.name}</span><span class="score">${entry.score}점</span></li>`
            ).join('');
        } else {
            leaderboardList.innerHTML = '<li>아직 등록된 기록이 없습니다.</li>';
        }

        leaderboardModalOverlay.style.display = 'flex';
    } catch (error) {
        console.error('리더보드 로딩 실패:', error);
        alert('리더보드를 불러오는 데 실패했습니다.');
    }
}

// 이름 입력 모달 관련 기능
const nameModalOverlay = document.getElementById('name-modal-overlay');
const submitScoreButton = document.getElementById('submit-score-button');
const playerNameInput = document.getElementById('player-name-input');
const finalScoreDisplay = document.getElementById('final-score-display');

let finalScoreForSubmission = 0;

function showNameInputModal(score, game) {
    finalScoreForSubmission = score;
    finalScoreDisplay.textContent = score;
    nameModalOverlay.style.display = 'flex';
    gameInstance = game; // game instance 참조 저장
}

submitScoreButton.addEventListener('click', async () => {
    const name = playerNameInput.value.trim();
    if (name) {
        await submitScore(name, finalScoreForSubmission);
        nameModalOverlay.style.display = 'none';
        await showLeaderboard(); // 점수 등록 후 리더보드 표시
    } else {
        alert('이름을 입력해주세요.');
    }
});

async function submitScore(name, score) {
    try {
        // 점수 등록 후 id를 반환받음
        const { data, error } = await supabaseClient
            .from('score')
            .insert({ name, score })
            .select('id')
            .single();

        if (error) throw error;

        if (data) {
            lastSubmittedScoreId = data.id; // 반환된 id 저장
        }
        
        alert('점수가 성공적으로 등록되었습니다!');
    } catch (error) {
        console.error('점수 등록 실패:', error);
        alert('점수 등록에 실패했습니다.');
    }
}