/**
 * BestCase 목록 조회 및 점수 확인 테스트
 */
import { runAgentScript } from '../../packages/ai-runner/dist/agentRunner.js';

const code = `
const list = await bestcase.listBestCases();

console.log('========================================');
console.log('📊 BestCase List with Scores');
console.log('========================================');
console.log(\`Total: \${list.total} projects\\n\`);

// Tier별 분류
const tierGroups = { S: [], A: [], B: [], C: [], D: [], None: [] };

list.bestcases.forEach(bc => {
  const tier = bc.scores?.tier || 'None';
  tierGroups[tier].push(bc);
});

// Tier별 출력
for (const tier of ['S', 'A', 'B', 'C', 'D', 'None']) {
  const projects = tierGroups[tier];
  if (projects.length === 0) continue;
  
  console.log(\`\\n🏆 Tier \${tier} (\${projects.length} projects)\`);
  console.log('─'.repeat(80));
  
  projects.forEach(bc => {
    if (bc.scores) {
      console.log(\`  \${bc.projectName}\`);
      console.log(\`    Total: \${bc.scores.total}/100 | API: \${bc.scores.api}/100 | Component: \${bc.scores.component}/100\`);
      console.log(\`    Category: \${bc.category} | Updated: \${bc.updatedAt.split('T')[0]}\`);
    } else {
      console.log(\`  \${bc.projectName}\`);
      console.log(\`    No score data available\`);
    }
  });
}

console.log('\\n========================================');
console.log('📈 Summary by Tier');
console.log('========================================');
for (const tier of ['S', 'A', 'B', 'C', 'D', 'None']) {
  const count = tierGroups[tier].length;
  if (count > 0) {
    const percentage = ((count / list.total) * 100).toFixed(1);
    console.log(\`Tier \${tier}: \${count} projects (\${percentage}%)\`);
  }
}

// Top 5 프로젝트
console.log('\\n========================================');
console.log('🌟 Top 5 Projects');
console.log('========================================');
const top5 = list.bestcases.filter(bc => bc.scores).slice(0, 5);
top5.forEach((bc, idx) => {
  console.log(\`\${idx + 1}. \${bc.projectName} (Tier \${bc.scores.tier})\`);
  console.log(\`   Total: \${bc.scores.total}/100 | API: \${bc.scores.api}/100 | Component: \${bc.scores.component}/100\`);
});
`;

async function main(): Promise<void> {
  console.log('🚀 Testing BestCase list with scores...\n');

  await runAgentScript({ code, timeoutMs: 30000 });

  console.log('\n✅ Test completed!');
}

main().catch(console.error);
