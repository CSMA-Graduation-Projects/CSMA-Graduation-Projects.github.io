document.addEventListener('DOMContentLoaded', function(){
  const navToggle = document.getElementById('nav-toggle');
  const mainNav = document.getElementById('main-nav');
  if(navToggle){
    navToggle.addEventListener('click', ()=>{
      if(getComputedStyle(mainNav).display === 'none' || mainNav.style.display === '') mainNav.style.display = 'flex';
      else mainNav.style.display = 'none';
    });
  }

  // smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', function(e){
      const target = document.querySelector(this.getAttribute('href'));
      if(target){
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth',block:'start'});
        if(window.innerWidth<=900 && mainNav) mainNav.style.display='none';
      }
    });
  });

  // back to top
  const back = document.getElementById('back-to-top');
  window.addEventListener('scroll', ()=>{
    if(window.scrollY>300) back.style.display='block'; else back.style.display='none';
  });
  back.addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'}));

  // simple active nav on scroll
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.main-nav a');
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(ent=>{
      const id = ent.target.id;
      const link = document.querySelector('.main-nav a[href="#'+id+'"]');
      if(link) link.classList.toggle('active', ent.isIntersecting);
    });
  },{threshold:0.45});
  sections.forEach(s=>obs.observe(s));
});
