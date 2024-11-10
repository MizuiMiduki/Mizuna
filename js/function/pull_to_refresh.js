let startY;
let pullDistance = 0;
let maxPullDistance = window.innerHeight * 0.2;

document.addEventListener('touchstart', handleTouchStart);
document.addEventListener('touchmove', handleTouchMove);
document.addEventListener('touchend', handleTouchEnd);
document.addEventListener('visibilitychange', handleVisibilityChange);

const refreshIcon = document.querySelector('.refresh-icon');
let currentRotation = 0;
let currentTurn = 0;
const totalTurns = 3;

function handleTouchStart(event) {
    if (window.scrollY === 0) {
        startY = event.touches[0].pageY;
        pullDistance = 0;
    }
}

function handleTouchMove(event) {
    const currentY = event.touches[0].pageY;
    pullDistance = currentY - startY;

    if (pullDistance > 0 && window.scrollY === 0) {
        const translateY = Math.min(pullDistance / 2, maxPullDistance);
        const rotateAngle = Math.min((pullDistance / maxPullDistance) * 360, 360);

        refreshIcon.style.transform = `translate(-50%, ${translateY}px) rotate(${rotateAngle}deg)`;
        currentRotation = rotateAngle;
    }
}

function handleTouchEnd() {
    if (pullDistance >= maxPullDistance) {
        animateRotation();
    } else {
        refreshIcon.style.transform = `translate(-50%, -50px) rotate(0deg)`;
    }
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
