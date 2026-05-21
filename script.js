// 导航切换与平滑滚动
document.addEventListener('DOMContentLoaded', function(){
  const navToggle = document.getElementById('nav-toggle');
  const mainNav = document.querySelector('.main-nav');
  if(navToggle){
    navToggle.addEventListener('click', ()=>{
      if(mainNav.style.display === 'flex') mainNav.style.display = '';
      else mainNav.style.display = 'flex';
    });
  }

  // 平滑滚动
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', function(e){
      const target = document.querySelector(this.getAttribute('href'));
      if(target){
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth',block:'start'});
        // collapse nav on mobile
        if(window.innerWidth<=800 && mainNav) mainNav.style.display='';
      }
    });
  });

  // 返回顶部
  const back = document.getElementById('back-to-top');
  window.addEventListener('scroll', ()=>{
    if(window.scrollY>300) back.style.display='block'; else back.style.display='none';
  });
  back.addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'}));
});
