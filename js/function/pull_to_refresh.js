let startY;
let pullDistance = 0;
let maxPullDistance = window.innerHeight * 0.2;
let iconOffset = window.innerHeight * 0.1;

document.addEventListener('touchstart', handleTouchStart, { passive: false });
document.addEventListener('touchmove', handleTouchMove, { passive: false });
document.addEventListener('touchend', handleTouchEnd);
document.addEventListener('visibilitychange', handleVisibilityChange);

const refreshIcon = document.querySelector('.refresh-icon');
let currentRotation = 0;
let currentTurn = 0;
const totalTurns = 3;

let isPullStartedFromHeader = false;

function handleTouchStart(event) {
    const target = event.target.closest('.header');
    if (!target) return;

    isPullStartedFromHeader = true;
    startY = event.touches[0].pageY + iconOffset;
    pullDistance = 0;
}

function handleTouchMove(event) {
    if (!isPullStartedFromHeader) return;

    const currentY = event.touches[0].pageY;
    pullDistance = currentY - startY;

    if (pullDistance > 0) {
        const translateY = Math.min(pullDistance, maxPullDistance);
        const rotateAngle = Math.min((pullDistance / maxPullDistance) * 360, 360);

        refreshIcon.style.transform = `translate(-50%, ${translateY}px) rotate(${rotateAngle}deg)`;
        currentRotation = rotateAngle;
    }
}

function handleTouchEnd() {
    if (!isPullStartedFromHeader) return;

    if (pullDistance >= maxPullDistance) {
        animateRotation();
    } else {
        refreshIcon.style.transform = `translate(-50%, -50px) rotate(0deg)`;
    }

    isPullStartedFromHeader = false;
}

function handleVisibilityChange() {
    if (document.hidden) {
        refreshIcon.style.transition = 'none';
    } else {
        refreshIcon.style.transition = 'transform 0.2s ease-out';
        refreshIcon.style.transform = 'translate(-50%, -50px) rotate(0deg)';
    }
}

function animateRotation() {
    let startTime = null;

    function rotationStep(time) {
        if (!startTime) startTime = time;
        let progress = (time - startTime) / (1000 / totalTurns);
        progress = Math.min(progress, 1);

        let easingProgress = easeInOut(progress);
        let rotateAngle = currentRotation + 360 * easingProgress;
        refreshIcon.style.transform = `translate(-50%, ${maxPullDistance}px) rotate(${rotateAngle}deg)`;

        if (progress < 1) {
            requestAnimationFrame(rotationStep);
        } else {
            currentTurn++;
            if (currentTurn < totalTurns) {
                setTimeout(() => {
                    currentRotation = rotateAngle;
                    animateRotation();
                }, 100);
            } else {
                setTimeout(() => {
                    window.location.reload();
                }, 100);
            }
        }
    }

    requestAnimationFrame(rotationStep);
}

function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

window.addEventListener('resize', () => {
    maxPullDistance = window.innerHeight * 0.2;
});
