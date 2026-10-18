const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

export function createQuestionEditor(container, {type, questions}) {
  const multipleChoice = ['pre', 'post'].includes(type);
  const items = questions.map(question => multipleChoice
    ? {text: question.text, options: [...question.options], key: question.key}
    : {text: question.text});
  let previewOpen = false;
  const blankQuestion = () => multipleChoice ? {text: '', options: ['', ''], key: null} : {text: ''};
  if (!items.length) items.push(blankQuestion());

  function preview() {
    const target = container.querySelector('.question-preview');
    target.hidden = !previewOpen;
    if (!previewOpen) return;
    target.innerHTML = `<h4>Pratinjau pertanyaan</h4><p class="muted">${multipleChoice ? 'Kunci jawaban hanya terlihat oleh pengelola.' : type === 'followup' ? 'Peserta dan atasan memberikan penilaian pada skala 1–5.' : 'Pengisi menjawab dalam bentuk uraian.'}</p>${items.map((question,index) => `<section class="preview-item"><b>${index + 1}. ${escape(question.text) || '<span class="muted">Pertanyaan belum diisi</span>'}</b>${multipleChoice ? question.options.map((value,optionIndex) => `<div class="preview-option"><span>${String.fromCharCode(65 + optionIndex)}.</span><span>${escape(value) || '<em>Pilihan belum diisi</em>'}</span>${question.key === optionIndex ? '<span class="badge green">Kunci jawaban</span>' : ''}</div>`).join('') : type === 'followup' ? '<p class="preview-scale">1 · Sangat rendah &nbsp; 2 · Rendah &nbsp; 3 · Cukup &nbsp; 4 · Baik &nbsp; 5 · Sangat baik</p>' : '<div class="preview-answer">Area jawaban uraian</div>'}</section>`).join('')}`;
  }

  function render() {
    container.innerHTML = `<div class="editor-toolbar"><div><h4>Daftar pertanyaan <span class="badge">${items.length} butir</span></h4><p class="muted">${multipleChoice ? 'Tulis pertanyaan dan pilihan jawaban, lalu tandai satu jawaban yang benar.' : type === 'followup' ? 'Tulis pernyataan yang akan dinilai menggunakan skala 1–5.' : 'Tulis pertanyaan untuk dijawab dalam bentuk uraian.'}</p></div><button type="button" class="secondary small" data-action="preview" aria-expanded="${previewOpen}">${previewOpen ? 'Tutup pratinjau' : 'Pratinjau soal'}</button></div><div class="question-preview" hidden></div><div class="editor-questions">${items.map((question,index) => `<fieldset class="editor-question" data-question="${index}"><legend>Pertanyaan ${index + 1}</legend><div class="question-controls"><button type="button" class="secondary small" data-action="up" aria-label="Naikkan pertanyaan ${index + 1}" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" class="secondary small" data-action="down" aria-label="Turunkan pertanyaan ${index + 1}" ${index === items.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="danger-link small" data-action="delete-question" aria-label="Hapus pertanyaan ${index + 1}" ${items.length === 1 ? 'disabled' : ''}>Hapus soal</button></div><label class="field">${type === 'followup' ? 'Pernyataan penilaian' : 'Teks pertanyaan'}<textarea data-field="text" aria-label="${type === 'followup' ? 'Pernyataan' : 'Pertanyaan'} ${index + 1}" maxlength="3000" required placeholder="Tulis ${type === 'followup' ? 'pernyataan' : 'pertanyaan'} di sini…">${escape(question.text)}</textarea></label>${multipleChoice ? `<div class="answer-heading"><b>Pilihan jawaban</b><span>Pilih lingkaran pada jawaban yang benar</span></div><div class="editor-options">${question.options.map((value,optionIndex) => `<div class="editor-option ${question.key === optionIndex ? 'correct' : ''}" data-option="${optionIndex}"><label class="answer-key" title="Tandai sebagai jawaban benar"><input type="radio" name="correct-answer-${index}" value="${optionIndex}" data-field="key" aria-label="Jawaban benar: pilihan ${String.fromCharCode(65 + optionIndex)}, pertanyaan ${index + 1}" ${question.key === optionIndex ? 'checked' : ''} required><span>${String.fromCharCode(65 + optionIndex)}</span></label><input type="text" data-field="option" aria-label="Pilihan ${String.fromCharCode(65 + optionIndex)}, pertanyaan ${index + 1}" value="${escape(value)}" maxlength="500" placeholder="Teks pilihan ${String.fromCharCode(65 + optionIndex)}" required><button type="button" class="remove-option" data-action="delete-option" aria-label="Hapus pilihan ${String.fromCharCode(65 + optionIndex)}, pertanyaan ${index + 1}" ${question.options.length <= 2 ? 'disabled' : ''}>×</button></div>`).join('')}</div><button type="button" class="secondary small" data-action="add-option" ${question.options.length >= 6 ? 'disabled' : ''}>+ Tambah pilihan</button><p class="editor-hint">2–6 pilihan per soal · <span class="key-summary">${question.key == null ? 'Belum memilih jawaban benar' : `Jawaban benar: ${String.fromCharCode(65 + question.key)}`}</span></p>` : type === 'followup' ? '<div class="scale-guide"><span>Skala penilaian</span><b>1</b><b>2</b><b>3</b><b>4</b><b>5</b><small>Sangat rendah → Sangat baik</small></div>' : '<p class="editor-hint">Pengisi akan mendapatkan kolom jawaban uraian.</p>'}</fieldset>`).join('')}</div><div class="editor-bottom"><button type="button" class="secondary" data-action="add-question" ${items.length >= 100 ? 'disabled' : ''}>+ Tambah pertanyaan</button><span class="muted">Maksimal 100 pertanyaan</span></div>`;
    preview();
  }

  container.addEventListener('input', event => {
    const card = event.target.closest('[data-question]');
    if (!card) return;
    const question = items[Number(card.dataset.question)];
    if (event.target.dataset.field === 'text') question.text = event.target.value;
    if (event.target.dataset.field === 'option') question.options[Number(event.target.closest('[data-option]').dataset.option)] = event.target.value;
    if (event.target.dataset.field === 'key') {
      question.key = Number(event.target.value);
      card.querySelectorAll('.editor-option').forEach(row => row.classList.toggle('correct', Number(row.dataset.option) === question.key));
      card.querySelector('.key-summary').textContent = `Jawaban benar: ${String.fromCharCode(65 + question.key)}`;
    }
    preview();
  });

  container.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    const card = button.closest('[data-question]');
    const index = card ? Number(card.dataset.question) : null;
    const optionIndex = Number(button.closest('[data-option]')?.dataset.option);
    let focusQuestion = index;
    let focusOption = null;
    switch (action) {
      case 'preview': previewOpen = !previewOpen; break;
      case 'add-question': if (items.length >= 100) return; items.push(blankQuestion()); focusQuestion = items.length - 1; break;
      case 'delete-question':
        if (items.length === 1) return;
        if ((items[index].text.trim() || items[index].options?.some(value => value.trim())) && !window.confirm(`Hapus pertanyaan ${index + 1} dari rancangan ini? Perubahan baru disimpan setelah Anda menekan Simpan versi baru.`)) return;
        items.splice(index, 1); focusQuestion = Math.min(index, items.length - 1); break;
      case 'up': if (index === 0) return; [items[index - 1], items[index]] = [items[index], items[index - 1]]; focusQuestion = index - 1; break;
      case 'down': if (index === items.length - 1) return; [items[index + 1], items[index]] = [items[index], items[index + 1]]; focusQuestion = index + 1; break;
      case 'add-option': if (items[index].options.length >= 6) return; items[index].options.push(''); focusOption = items[index].options.length - 1; break;
      case 'delete-option':
        if (items[index].options.length <= 2) return;
        items[index].options.splice(optionIndex, 1);
        if (items[index].key === optionIndex) items[index].key = null;
        else if (items[index].key > optionIndex) items[index].key--;
        break;
      default: return;
    }
    const scrollContainer = container.closest('.modal');
    const scrollTop = scrollContainer?.scrollTop;
    render();
    if (action === 'preview') container.querySelector('[data-action="preview"]').focus({preventScroll:true});
    else if (focusQuestion != null) {
      const selector = focusOption == null ? '[data-field="text"]' : `[data-option="${focusOption}"] [data-field="option"]`;
      container.querySelector(`[data-question="${focusQuestion}"] ${selector}`)?.focus({preventScroll:true});
      if (action === 'add-question') container.querySelector(`[data-question="${focusQuestion}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'});
    }
    if (scrollContainer && action !== 'add-question') scrollContainer.scrollTop = scrollTop;
  });

  render();
  return {
    readQuestions() {
      if (!items.length) throw Error('Tambahkan minimal satu pertanyaan.');
      return items.map((question,index) => {
        if (!question.text.trim()) throw Error(`Teks pertanyaan ${index + 1} wajib diisi.`);
        if (multipleChoice) {
          if (question.options.some(value => !value.trim())) throw Error(`Lengkapi semua pilihan pada pertanyaan ${index + 1}.`);
          if (!Number.isInteger(question.key) || question.key < 0 || question.key >= question.options.length) throw Error(`Pilih jawaban benar untuk pertanyaan ${index + 1}.`);
          return {text: question.text.trim(), options: question.options.map(value => value.trim()), key: question.key};
        }
        return {text: question.text.trim()};
      });
    }
  };
}
