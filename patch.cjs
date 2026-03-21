const fs = require('fs');
const content = fs.readFileSync('src/components/ChatRoom.tsx', 'utf8');

const replacement = `                             // 🌟 核心修复：手动调用底层 astro 引擎实例化星盘
                             let astrolabeInstance;
                             const bType = obj.rawParams.birthdayType || 'solar';
                             const isLeap = obj.rawParams.isLeapMonth || false;
                             
                             if (bType === 'lunar') {
                               astrolabeInstance = astro.byLunar(obj.rawParams.birthday, obj.rawParams.birthTime, obj.rawParams.gender, isLeap, true, 'zh-CN');
                             } else {
                               astrolabeInstance = astro.bySolar(obj.rawParams.birthday, obj.rawParams.birthTime, obj.rawParams.gender, true, 'zh-CN');
                             }

                             // 🌟 强行将外部的“时空穿梭机”时间注入到底层引擎中
                             if (selectedDecadeIndex !== null || selectedYear !== null) {
                               astrolabeInstance.horoscope(focusDate);
                             }

                             return (
                               <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                 <div className="relative w-full h-full flex items-center justify-center">
                                   <div className="origin-center transform scale-[0.35] sm:scale-[0.55] md:scale-[0.68] lg:scale-[0.81] xl:scale-[0.89] transition-all duration-500 ease-in-out flex items-center justify-center" style={{ width: '1000px', height: '1000px', minWidth: '1000px', minHeight: '1000px' }}>
                                     <Iztrolabe 
                                       key={\`iztro-\${selectedDecadeIndex}-\${selectedYear}-\${focusDate.getTime()}\`}
                                       astrolabe={astrolabeInstance} 
                                       width={1000} 
                                     />
                                   </div>
                                 </div>
                               </div>
                             );`;

const regex = /return \(\s*<div className="w-full h-full flex items-center justify-center overflow-hidden">\s*<div className="relative w-full h-full flex items-center justify-center">\s*<div className="origin-center transform scale-\[0\.35\] sm:scale-\[0\.55\] md:scale-\[0\.68\] lg:scale-\[0\.81\] xl:scale-\[0\.89\] transition-all duration-500 ease-in-out flex items-center justify-center" style={{ width: '1000px', height: '1000px', minWidth: '1000px', minHeight: '1000px' }}>\s*<Iztrolabe\s*key={`iztro-\${selectedDecadeIndex}-\${selectedYear}-\${focusDate\.getTime\(\)}`}\s*width={1000}\s*birthday={obj\.rawParams\.birthday}\s*birthTime={obj\.rawParams\.birthTime}\s*birthdayType={obj\.rawParams\.birthdayType \|\| 'solar'}\s*gender={obj\.rawParams\.gender}\s*\{\.\.\.\(\(selectedDecadeIndex !== null \|\| selectedYear !== null\) \? \{\s*horoscopeDate: `\${focusDate\.getFullYear\(\)}-\${String\(focusDate\.getMonth\(\) \+ 1\)\.padStart\(2, '0'\)}-\${String\(focusDate\.getDate\(\)\)\.padStart\(2, '0'\)}`\s*\} : \{\}\)\}\s*\/>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);/m;

if (regex.test(content)) {
  fs.writeFileSync('src/components/ChatRoom.tsx', content.replace(regex, replacement));
  console.log("Replaced successfully");
} else {
  console.log("Regex did not match");
}
