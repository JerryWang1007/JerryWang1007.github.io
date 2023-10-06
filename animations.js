document.addEventListener('DOMContentLoaded', (event) => {
  const bodyElement = document.getElementById('body');
  const lightdarkmode = document.getElementById('lightdarkmode');
  const backgroundspin = document.getElementById('backgroundspin')
  let rotationAngle = 0;

  lightdarkmode.addEventListener('click', () => {
      bodyElement.style.backgroundColor = 'black';
    });

  const rotationInterval = setInterval(() => {
    rotationAngle += 0.1;
    backgroundspin.style.transform = `translateZ(0px) rotate(${rotationAngle}deg)`;
  }, 3);
});
