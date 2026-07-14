export function exportToJSON(reviewData: any) {
  const filename = `revivecode-report-${reviewData.id || 'export'}.json`;
  const jsonString = JSON.stringify(reviewData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
  URL.revokeObjectURL(url);
}

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(reviewData: any) {
  const lines: string[] = [];
  
  // Header section
  lines.push('--- REVIVECODE REPORT SUMMARY ---');
  lines.push(`Report ID,${escapeCSV(reviewData.id || 'Anonymous')}`);
  lines.push(`Language,${escapeCSV(reviewData.language || 'Multiple Files')}`);
  lines.push(`Analyzed On,${escapeCSV(reviewData.created_at || new Date().toISOString())}`);
  if (reviewData.label) {
    lines.push(`Repository/Target,${escapeCSV(reviewData.label)}`);
  }
  lines.push('');
  
  // Scores section
  lines.push('--- HEALTH SCORES ---');
  lines.push(`Overall Health Score,${escapeCSV(reviewData.overallScore)}/100`);
  if (reviewData.categoryScores) {
    Object.entries(reviewData.categoryScores).forEach(([category, score]) => {
      lines.push(`${category.charAt(0).toUpperCase() + category.slice(1)},${escapeCSV(score)}/100`);
    });
  }
  lines.push('');
  
  // Severity Counts section
  lines.push('--- SEVERITY COUNTS ---');
  if (reviewData.severityCounts) {
    Object.entries(reviewData.severityCounts).forEach(([severity, count]) => {
      lines.push(`${severity.charAt(0).toUpperCase() + severity.slice(1)},${escapeCSV(count)}`);
    });
  }
  lines.push('');
  
  // AI Summary section
  lines.push('--- AI SYNTHESIS SUMMARY ---');
  lines.push(escapeCSV(reviewData.summary || 'No AI summary available.'));
  lines.push('');
  
  // Issues table section
  lines.push('--- DETECTED ISSUES ---');
  lines.push('Issue No,Severity,Line,File,Title,Description,Suggestion,AI Detected');
  
  const issues = reviewData.issues || [];
  issues.forEach((issue: any, index: number) => {
    lines.push([
      index + 1,
      escapeCSV(issue.severity),
      escapeCSV(issue.line !== undefined ? issue.line : 'N/A'),
      escapeCSV(issue.file || 'N/A'),
      escapeCSV(issue.title),
      escapeCSV(issue.description),
      escapeCSV(issue.suggestion || 'N/A'),
      escapeCSV(issue.is_ai ? 'Yes' : 'No')
    ].join(','));
  });
  
  const csvContent = lines.join('\n');
  const filename = `revivecode-report-${reviewData.id || 'export'}.csv`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
  URL.revokeObjectURL(url);
}

export function exportToMarkdown(reviewData: any) {
  const md: string[] = [];
  const titleLabel = reviewData.label ? `Repository Report: ${reviewData.label.split('\n')[0]}` : `Code Review Report`;
  
  md.push(`# ${titleLabel} \`#${reviewData.id || 'Anonymous'}\``);
  md.push('');
  md.push(`- **Language/Scope:** \`${reviewData.language || 'Multiple Files'}\``);
  md.push(`- **Analyzed On:** ${reviewData.created_at ? new Date(reviewData.created_at).toLocaleString() : new Date().toLocaleString()}`);
  if (reviewData.branch) md.push(`- **Branch:** \`${reviewData.branch}\``);
  if (reviewData.pr_number) md.push(`- **Pull Request:** \`#${reviewData.pr_number}\``);
  if (reviewData.commit) md.push(`- **Commit:** \`${reviewData.commit}\``);
  if (reviewData.files_count !== undefined) md.push(`- **Files Scanned:** ${reviewData.files_count}`);
  
  const overall = reviewData.overallScore || 0;
  const progressBar = '█'.repeat(Math.round(overall / 10)) + '░'.repeat(10 - Math.round(overall / 10));
  md.push(`- **Overall Health Score:** **${overall}/100** \`[${progressBar}]\``);
  md.push('');
  
  md.push('## 📊 Quality Analytics');
  md.push('');
  
  // Category Scores Table
  md.push('### Category Scores');
  md.push('| Category | Score | Breakdown |');
  md.push('| :--- | :--- | :--- |');
  if (reviewData.categoryScores) {
    Object.entries(reviewData.categoryScores).forEach(([category, score]: [string, any]) => {
      const catVal = Number(score) || 0;
      const catBar = '█'.repeat(Math.round(catVal / 10)) + '░'.repeat(10 - Math.round(catVal / 10));
      md.push(`| ${category.charAt(0).toUpperCase() + category.slice(1)} | **${catVal}/100** | \`[${catBar}]\` |`);
    });
  }
  md.push('');
  
  // Severity Counts Table
  md.push('### Severity Breakdown');
  md.push('| Severity | Count |');
  md.push('| :--- | :--- |');
  const severityCounts = reviewData.severityCounts || { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  Object.entries(severityCounts).forEach(([sev, count]) => {
    md.push(`| ${sev.charAt(0).toUpperCase() + sev.slice(1)} | **${count}** |`);
  });
  md.push('');

  // Add Mermaid Chart for markdown support
  md.push('#### Visual Severity Distribution (Mermaid)');
  md.push('```mermaid');
  md.push('pie title Issues by Severity');
  Object.entries(severityCounts).forEach(([sev, count]) => {
    if (Number(count) > 0) {
      md.push(`    "${sev.charAt(0).toUpperCase() + sev.slice(1)}" : ${count}`);
    }
  });
  md.push('```');
  md.push('');

  // Repos stats if applicable
  if (reviewData.problematic_files && reviewData.problematic_files.length > 0) {
    md.push('### Problematic Files');
    md.push('| File Path | Health Score |');
    md.push('| :--- | :--- |');
    reviewData.problematic_files.forEach((f: any) => {
      md.push(`| \`${f.file}\` | **${f.score}/100** |`);
    });
    md.push('');
  }
  
  // AI Summary
  if (reviewData.summary) {
    md.push('## ✨ AI Synthesis Summary');
    md.push('');
    md.push(`> ${reviewData.summary}`);
    md.push('');
  }
  
  // Issues list
  const issues = reviewData.issues || [];
  md.push(`## 🔍 Detected Issues (${issues.length})`);
  md.push('');
  
  if (issues.length === 0) {
    md.push('🎉 **No issues found!** Your code is clean, optimized, and secure.');
    md.push('');
  } else {
    // Issues Summary Table
    md.push('| # | Severity | Line | File | Title |');
    md.push('|---|---|---|---|---|');
    issues.forEach((issue: any, index: number) => {
      md.push(`| ${index + 1} | \`${issue.severity}\` | ${issue.line !== undefined ? issue.line : 'N/A'} | \`${issue.file || 'N/A'}\` | ${issue.title} |`);
    });
    md.push('');
    
    // Detailed list
    md.push('### Detailed Issues Log');
    md.push('');
    issues.forEach((issue: any, index: number) => {
      md.push(`### [Issue #${index + 1}] ${issue.title}`);
      md.push('');
      md.push(`- **Severity:** \`${issue.severity}\``);
      md.push(`- **Location:** ${issue.line !== undefined ? `Line ${issue.line}` : 'N/A'} in \`${issue.file || 'N/A'}\``);
      if (issue.is_ai) {
        md.push('- **Source:** AI Logic Checker');
      }
      md.push('');
      md.push('**Description:**');
      md.push(issue.description);
      md.push('');
      
      if (issue.suggestion) {
        md.push('**Recommended Fix:**');
        md.push('');
        let lang = 'javascript';
        if (issue.file) {
          const ext = issue.file.slice(issue.file.lastIndexOf('.')).toLowerCase();
          const extMap: Record<string, string> = {
            '.py': 'python',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.go': 'go',
            '.java': 'java',
            '.cpp': 'cpp',
            '.cc': 'cpp',
            '.h': 'cpp'
          };
          lang = extMap[ext] || lang;
        } else if (reviewData.language) {
          lang = reviewData.language.toLowerCase();
        }
        md.push(`\`\`\`${lang}`);
        md.push(issue.suggestion);
        md.push('\`\`\`');
        md.push('');
      }
      md.push('---');
      md.push('');
    });
  }
  
  const mdContent = md.join('\n');
  const filename = `revivecode-report-${reviewData.id || 'export'}.md`;
  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
  URL.revokeObjectURL(url);
}
