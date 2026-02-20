(function() {
    // Safe Storage
    class SafeStorage {
        static save(key, data) {
            try { 
                localStorage.setItem(key, JSON.stringify(data)); 
                return true; 
            } catch(e) { 
                console.warn('Storage failed:', e);
                return false; 
            }
        }
        static load(key, defaultValue) {
            try { 
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue; 
            } catch(e) { 
                console.warn('Load failed:', e);
                return defaultValue; 
            }
        }
    }

    // XSS escape
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Task item template
    function createTaskListItem(task, onClick) {
        return `
            <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-secondary);border-radius:var(--radius-md);margin-bottom:4px;cursor:pointer;" 
                 onclick="${onClick}">
                <div style="flex:1">${escapeHtml(task.title)}</div>
                <span style="color:var(--text-secondary);">${task.time}m</span>
                ${task.completed ? '<i class="fas fa-check-circle" style="color:var(--color-primary);"></i>' : ''}
            </div>
        `;
    }

    // Main App - FIXED VERSION
    class CathedralOS {
        constructor() {
            this.currentDate = this.getToday();
            this.currentView = 'flow';
            this.editingTaskId = null;
            this.editingNoteId = null;
            this.deferredPrompt = null;
            
            this.state = SafeStorage.load('cathedral', this.getInitialState());
            this.init();
        }

        getToday() {
            const d = new Date(); 
            d.setHours(0,0,0,0); 
            return d;
        }

        getInitialState() {
            const today = this.formatDate(new Date());
            return {
                darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
                dailySchedule: [
                    { id:'1', time:'4:00', title:'Meditation & Scripture' },
                    { id:'2', time:'5:00', title:'Workout' },
                    { id:'3', time:'6:00', title:'Creative Work' },
                    { id:'4', time:'7:00', title:'Breakfast' },
                    { id:'5', time:'8:00', title:'Projects' },
                    { id:'6', time:'10:00', title:'Break' },
                    { id:'7', time:'10:30', title:'Production' },
                    { id:'8', time:'12:00', title:'Lunch' },
                    { id:'9', time:'13:00', title:'Rest', locked: true },
                    { id:'10', time:'15:00', title:'Analytical' },
                    { id:'11', time:'16:00', title:'Social' },
                    { id:'12', time:'17:00', title:'Family' },
                    { id:'13', time:'18:00', title:'Buffer' },
                    { id:'14', time:'19:00', title:'Learning' },
                    { id:'15', time:'20:00', title:'Wind Down' },
                    { id:'16', time:'21:00', title:'Reflection' },
                    { id:'17', time:'22:00', title:'Sleep', locked: true }
                ],
                dailyRhythm: [
                    { id:'sacred_launch', time:'4:00-7:00', title:'Sacred Launch', blocks:['1','2','3'] },
                    { id:'mission_zones', time:'7:00-13:00', title:'Mission Zones', blocks:['4','5','6','7','8'] },
                    { id:'restoration', time:'13:00-15:00', title:'Restoration', blocks:['9'] },
                    { id:'engagement', time:'15:00-21:00', title:'Engagement', blocks:['10','11','12','13','14','15'] },
                    { id:'sanctuary', time:'21:00-4:00', title:'Sanctuary', blocks:['16','17'] }
                ],
                tasks: [
                    { id:'task1', title:'Design homepage', time:60, scheduleId:'5', date:today, completed:false, notes:'Focus on minimalist design' },
                    { id:'task2', title:'Morning workout', time:45, scheduleId:'2', date:today, completed:true, notes:'' },
                    { id:'task3', title:'Meditation', time:30, scheduleId:'1', date:today, completed:false, notes:'' }
                ],
                notes: [
                    { id:'note1', content:'Best creative work after morning prayer.', createdAt:new Date().toISOString() },
                    { id:'note2', content:'Remember to stretch before workout.', createdAt:new Date().toISOString() }
                ]
            };
        }

        saveState() { 
            SafeStorage.save('cathedral', this.state); 
        }
        
        init() {
            this.applyTheme();
            this.updateDateDisplay();
            this.setupEventListeners();
            this.renderCurrentView();
            setTimeout(()=>document.getElementById('loadingScreen').style.display='none', 400);
        }

        // PWA install
        installPWA() {
            if(this.deferredPrompt) {
                this.deferredPrompt.prompt();
                this.deferredPrompt = null;
            }
            this.closeInstallPrompt();
        }
        closeInstallPrompt() { 
            document.getElementById('installPrompt').style.display = 'none'; 
        }

        applyTheme() {
            if(this.state.darkMode){ 
                document.body.classList.add('dark-mode'); 
                document.querySelector('#themeToggle i').className='fas fa-sun'; 
            } else { 
                document.body.classList.remove('dark-mode'); 
                document.querySelector('#themeToggle i').className='fas fa-moon'; 
            }
        }
        
        toggleTheme(){ 
            this.state.darkMode = !this.state.darkMode; 
            this.applyTheme(); 
            this.saveState(); 
            this.showToast('Theme changed'); 
        }

        updateDateDisplay() {
            document.getElementById('currentDate').textContent = this.currentDate.toLocaleDateString('en-US',{
                weekday:'short', month:'short', day:'numeric'
            });
        }

        formatDate(date) {
            if (!date) return '';
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        }

        parseLocalDate(dateStr) {
            if (!dateStr) return this.getToday();
            const [y,m,d] = dateStr.split('-').map(Number);
            return new Date(y, m-1, d);
        }

        renderCurrentView() {
            // Update navigation active states
            document.querySelectorAll('.sidebar-item, .nav-item').forEach(i=>{
                i.classList.toggle('active', i.dataset.view === this.currentView);
            });
            
            // Show correct view
            document.querySelectorAll('.view-container').forEach(v=>v.classList.remove('active'));
            document.getElementById(`${this.currentView}View`).classList.add('active');
            
            // Render view content
            if(this.currentView === 'flow') this.renderFlowView();
            else if(this.currentView === 'calendar') this.renderCalendarView();
            else if(this.currentView === 'data') this.renderDataView();
        }

        renderFlowView() {
            const container = document.getElementById('timeGrid');
            const currentHour = new Date().getHours() + new Date().getMinutes()/60;
            const todayStr = this.formatDate(this.currentDate);
            
            let html = '';
            for(let rhythm of this.state.dailyRhythm) {
                html += `<div class="rhythm-header">${rhythm.time} • ${rhythm.title}</div>`;
                for(let blockId of rhythm.blocks) {
                    const block = this.state.dailySchedule.find(b=>b.id===blockId);
                    if(!block) continue;
                    
                    const blockHour = parseInt(block.time.split(':')[0]);
                    const isCurrent = Math.floor(blockHour) === Math.floor(currentHour);
                    const tasks = this.state.tasks.filter(t => t.scheduleId === block.id && t.date === todayStr);
                    const completed = tasks.filter(t => t.completed).length;
                    
                    html += `<div class="time-block ${isCurrent?'current':''} ${block.locked?'locked':''}" onclick="app.viewTimeBlock('${block.id}')">`;
                    html += `<div class="time-label">${block.time}</div>`;
                    html += `<div class="block-content"><div class="block-title">${block.title}`;
                    if(tasks.length) html += `<span class="task-count"> ${completed}/${tasks.length}</span>`;
                    html += `</div></div></div>`;
                }
            }
            container.innerHTML = html;
        }

        renderCalendarView() {
            const monthYear = document.getElementById('monthYear');
            const container = document.getElementById('calendarDays');
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            
            monthYear.textContent = this.currentDate.toLocaleDateString('en-US', { month:'long', year:'numeric' });
            container.innerHTML = '';
            
            const firstDay = new Date(year, month, 1).getDay();
            const lastDate = new Date(year, month + 1, 0).getDate();
            const today = this.getToday();
            
            // Previous month
            const prevMonthLastDate = new Date(year, month, 0).getDate();
            for (let i = 0; i < firstDay; i++) {
                const day = prevMonthLastDate - firstDay + i + 1;
                const date = new Date(year, month - 1, day);
                container.appendChild(this.createDayCell(date, false, false, true));
            }
            
            // Current month
            for (let day = 1; day <= lastDate; day++) {
                const date = new Date(year, month, day);
                date.setHours(0,0,0,0);
                const isToday = date.getTime() === today.getTime();
                const isPast = date < today;
                container.appendChild(this.createDayCell(date, isToday, isPast, false));
            }
            
            // Next month (fill to 42 cells)
            for (let day = 1; container.children.length < 42; day++) {
                const date = new Date(year, month + 1, day);
                container.appendChild(this.createDayCell(date, false, false, true));
            }
        }

        createDayCell(date, isToday, isPast, isOtherMonth) {
            const dateStr = this.formatDate(date);
            const tasks = this.state.tasks.filter(t => t.date === dateStr);
            const cell = document.createElement('div');
            cell.className = `calendar-day ${isToday?'today':''} ${isPast?'past':''} ${isOtherMonth?'other-month':''}`;
            cell.innerHTML = `
                <div class="day-number">${date.getDate()}</div>
                ${tasks.length ? `<div class="day-task-count">${tasks.filter(t=>t.completed).length}/${tasks.length}</div>` : ''}
                <button class="day-add-btn" onclick="event.stopPropagation(); app.addTaskToDate('${dateStr}')">+</button>
            `;
            cell.onclick = () => this.viewDayDetails(date);
            return cell;
        }

        renderDataView() {
            const container = document.getElementById('notesList');
            if(!this.state.notes.length) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-book"></i><p>No notes yet</p><button class="btn" onclick="app.addNote()">Add Note</button></div>';
                return;
            }
            container.innerHTML = this.state.notes.map(n=>`
                <div class="note-item" onclick="app.editNote('${n.id}')">
                    <div class="note-content">${escapeHtml(n.content.substring(0,120))}${n.content.length>120?'...':''}</div>
                    <div class="note-meta">${new Date(n.createdAt).toLocaleDateString()}</div>
                </div>
            `).join('');
        }

        viewTask(taskId) {
            const task = this.state.tasks.find(t=>t.id===taskId); 
            if(!task) return;
            
            const schedule = this.state.dailySchedule.find(s=>s.id===task.scheduleId);
            const content = `
                <h3 style="margin-bottom:12px;">${escapeHtml(task.title)}</h3>
                <div class="info-row"><div class="info-label">Date</div><div class="info-value">${this.parseLocalDate(task.date).toLocaleDateString()}</div></div>
                <div class="info-row"><div class="info-label">Time</div><div class="info-value">${task.time} min</div></div>
                <div class="info-row"><div class="info-label">Schedule</div><div class="info-value">${schedule?`${schedule.time} ${schedule.title}`:'Unscheduled'}</div></div>
                <div class="info-row"><div class="info-label">Status</div><div class="info-value"><span class="status-badge ${task.completed?'completed':''}">${task.completed?'Completed':'Pending'}</span></div></div>
                ${task.notes?`<div style="margin-top:12px;padding:8px;background:var(--bg-secondary);border-radius:var(--radius-md);">${escapeHtml(task.notes)}</div>`:''}
            `;
            
            this.showModal('Task', content, [
                {label:'Close', handler:'app.closeModal()'},
                {label:'Edit', handler:`app.editTask('${task.id}')`},
                {label: task.completed?'Mark incomplete':'Mark complete', handler:`app.toggleTaskCompletion('${task.id}')`, primary:true}
            ]);
        }

        editTask(taskId) {
            this.editingTaskId = taskId;
            const task = this.state.tasks.find(t=>t.id===taskId);
            if(!task) return;
            
            const scheduleOptions = this.state.dailySchedule.map(s=>`<option value="${s.id}" ${s.id===task.scheduleId?'selected':''}>${s.time} ${s.title}</option>`).join('');
            
            const content = `
                <div class="form-group"><label>Title</label><input class="form-input" id="taskTitle" value="${escapeHtml(task.title)}"></div>
                <div class="form-group"><label>Date</label><input class="form-input" type="date" id="taskDate" value="${task.date}"></div>
                <div class="form-group"><label>Schedule</label><select class="form-input" id="taskSchedule"><option value="">None</option>${scheduleOptions}</select></div>
                <div class="form-group"><label>Minutes</label><input class="form-input" type="number" id="taskTime" value="${task.time}" step="15" min="5" max="480"></div>
                <div class="form-group"><label>Notes</label><textarea class="form-input form-textarea" id="taskNotes">${escapeHtml(task.notes||'')}</textarea></div>
            `;
            
            this.showModal('Edit Task', content, [
                {label:'Cancel', handler:'app.closeModal()'},
                {label:'Delete', handler:`app.deleteTask('${task.id}')`},
                {label:'Save', handler:'app.updateTask()', primary:true}
            ]);
        }

        updateTask() {
            const title = document.getElementById('taskTitle')?.value.trim();
            const date = document.getElementById('taskDate')?.value;
            const scheduleId = document.getElementById('taskSchedule')?.value || null;
            const time = parseInt(document.getElementById('taskTime')?.value) || 60;
            const notes = document.getElementById('taskNotes')?.value.trim();
            
            if(!title || !date) { this.showToast('Title and date required'); return; }
            
            const task = this.state.tasks.find(t=>t.id===this.editingTaskId);
            if(task) { 
                Object.assign(task, { title, date, scheduleId, time, notes }); 
                this.saveState(); 
                this.closeModal(); 
                this.renderCurrentView(); 
                this.showToast('Task updated'); 
            }
        }

        deleteTask(taskId) { 
            if(!confirm('Delete task?')) return;
            this.state.tasks = this.state.tasks.filter(t=>t.id!==taskId); 
            this.saveState(); 
            this.closeModal(); 
            this.renderCurrentView(); 
            this.showToast('Task deleted'); 
        }
        
        toggleTaskCompletion(taskId) {
            const task = this.state.tasks.find(t=>t.id===taskId);
            if(task){ 
                task.completed = !task.completed; 
                this.saveState(); 
                this.closeModal(); 
                this.renderCurrentView(); 
                if(window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
                this.showToast(task.completed?'Completed ✓':'Uncompleted'); 
            }
        }

        addTask(scheduleId=null, date=null) {
            this.editingTaskId = null;
            const defaultDate = date || this.formatDate(new Date());
            const scheduleOptions = this.state.dailySchedule.map(s=>`<option value="${s.id}" ${s.id===scheduleId?'selected':''}>${s.time} ${s.title}</option>`).join('');
            
            const content = `
                <div class="form-group"><label>Title</label><input class="form-input" id="taskTitle" placeholder="e.g., Design homepage"></div>
                <div class="form-group"><label>Date</label><input class="form-input" type="date" id="taskDate" value="${defaultDate}"></div>
                <div class="form-group"><label>Schedule</label><select class="form-input" id="taskSchedule"><option value="">None</option>${scheduleOptions}</select></div>
                <div class="form-group"><label>Minutes</label><input class="form-input" type="number" id="taskTime" value="60" step="15" min="5" max="480"></div>
                <div class="form-group"><label>Notes</label><textarea class="form-input form-textarea" id="taskNotes" rows="2" placeholder="Optional notes..."></textarea></div>
            `;
            
            this.showModal('Add Task', content, [
                {label:'Cancel', handler:'app.closeModal()'},
                {label:'Add', handler:'app.saveNewTask()', primary:true}
            ]);
        }

        saveNewTask() {
            const title = document.getElementById('taskTitle')?.value.trim();
            const date = document.getElementById('taskDate')?.value;
            const scheduleId = document.getElementById('taskSchedule')?.value || null;
            const time = parseInt(document.getElementById('taskTime')?.value) || 60;
            const notes = document.getElementById('taskNotes')?.value.trim();
            
            if(!title || !date) { this.showToast('Title and date required'); return; }
            
            const newTask = { 
                id: 'task_' + Date.now(), 
                title, time, date, scheduleId, notes, completed: false 
            };
            
            this.state.tasks.push(newTask);
            this.saveState();
            this.closeModal();
            this.renderCurrentView();
            this.showToast('Task added');
        }

        addTaskToDate(dateStr) { this.addTask(null, dateStr); }
        addTaskToSchedule(scheduleId) { this.addTask(scheduleId, this.formatDate(this.currentDate)); }

        viewTimeBlock(scheduleId) {
            const schedule = this.state.dailySchedule.find(s=>s.id===scheduleId);
            const tasks = this.state.tasks.filter(t=>t.scheduleId===scheduleId && t.date===this.formatDate(this.currentDate));
            const list = tasks.length ? tasks.map(t=>createTaskListItem(t, `app.viewTask('${t.id}')`)).join('') : '<p style="text-align:center;padding:16px;">No tasks</p>';
            this.showModal(`${schedule.time} - ${schedule.title}`, 
                `${list}<button class="btn" onclick="app.addTaskToSchedule('${scheduleId}')" style="margin-top:12px;width:100%;">+ Add Task</button>`, 
                [{label:'Close',handler:'app.closeModal()',primary:true}]);
        }

        viewDayDetails(date) {
            const tasks = this.state.tasks.filter(t=>t.date===this.formatDate(date));
            const list = tasks.length ? tasks.map(t=>createTaskListItem(t, `app.viewTask('${t.id}')`)).join('') : '<p style="text-align:center;padding:16px;">No tasks</p>';
            this.showModal(date.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}), 
                `${list}<button class="btn" onclick="app.addTaskToDate('${this.formatDate(date)}')" style="margin-top:12px;width:100%;">+ Add Task</button>`, 
                [{label:'Close',handler:'app.closeModal()',primary:true}]);
        }

        // Notes
        addNote() {
            this.editingNoteId = null;
            this.showModal('Add Note', `
                <div class="form-group"><textarea class="form-input form-textarea" id="noteContent" rows="4" placeholder="Write your note..."></textarea></div>
            `, [
                {label:'Cancel', handler:'app.closeModal()'},
                {label:'Save', handler:'app.saveNote()', primary:true}
            ]);
        }

        editNote(noteId) {
            this.editingNoteId = noteId;
            const note = this.state.notes.find(n=>n.id===noteId);
            if(!note) return;
            this.showModal('Edit Note', `
                <div class="form-group"><textarea class="form-input form-textarea" id="noteContent" rows="4">${escapeHtml(note.content)}</textarea></div>
            `, [
                {label:'Cancel', handler:'app.closeModal()'},
                {label:'Delete', handler:`app.deleteNote('${note.id}')`},
                {label:'Update', handler:'app.updateNote()', primary:true}
            ]);
        }

        saveNote() {
            const content = document.getElementById('noteContent')?.value.trim();
            if(!content) { this.showToast('Content required'); return; }
            const newNote = { id:'note_'+Date.now(), content, createdAt:new Date().toISOString() };
            this.state.notes.unshift(newNote);
            this.saveState();
            this.closeModal();
            this.renderDataView();
            this.showToast('Note saved');
        }

        updateNote() {
            const content = document.getElementById('noteContent')?.value.trim();
            if(!content) return;
            const note = this.state.notes.find(n=>n.id===this.editingNoteId);
            if(note) { note.content = content; this.saveState(); this.closeModal(); this.renderDataView(); this.showToast('Note updated'); }
        }

        deleteNote(noteId) {
            if(!confirm('Delete note?')) return;
            this.state.notes = this.state.notes.filter(n=>n.id!==noteId);
            this.saveState(); this.closeModal(); this.renderDataView(); this.showToast('Note deleted');
        }

        // Navigation
        prevMonth() { 
            this.currentDate.setMonth(this.currentDate.getMonth() - 1); 
            this.renderCalendarView(); 
            this.updateDateDisplay(); 
        }
        nextMonth() { 
            this.currentDate.setMonth(this.currentDate.getMonth() + 1); 
            this.renderCalendarView(); 
            this.updateDateDisplay(); 
        }
        goToToday() { 
            this.currentDate = this.getToday(); 
            this.updateDateDisplay(); 
            this.renderCalendarView(); 
        }

        showModal(title, body, actions) {
            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalBody').innerHTML = body;
            document.getElementById('modalActions').innerHTML = actions.map(a=>`<button class="btn ${a.primary?'':'btn-secondary'}" onclick="${a.handler}">${a.label}</button>`).join('');
            document.getElementById('modal').classList.add('active');
        }
        
        closeModal() { 
            document.getElementById('modal').classList.remove('active'); 
            this.editingTaskId = null; 
            this.editingNoteId = null; 
        }
        
        showToast(m) { 
            const t = document.getElementById('toast'); 
            t.textContent = m;
            t.classList.add('show'); 
            setTimeout(() => t.classList.remove('show'), 2000); 
        }

        setupEventListeners() {
            document.getElementById('themeToggle').addEventListener('click', ()=>this.toggleTheme());
            document.getElementById('closeModalBtn').addEventListener('click', ()=>this.closeModal());
            document.getElementById('currentDate').addEventListener('click', ()=>{ 
                this.currentDate = this.getToday(); 
                this.updateDateDisplay(); 
                this.switchView('flow'); 
            });
            
            document.querySelectorAll('.sidebar-item, .nav-item').forEach(i=>{
                i.addEventListener('click', (e)=>this.switchView(e.currentTarget.dataset.view));
            });
            
            document.getElementById('prevMonth')?.addEventListener('click', ()=>this.prevMonth());
            document.getElementById('nextMonth')?.addEventListener('click', ()=>this.nextMonth());
            document.getElementById('todayCalendarBtn')?.addEventListener('click', ()=>{ 
                this.goToToday();
                this.switchView('calendar'); 
            });
            
            document.getElementById('addNoteBtn')?.addEventListener('click', ()=>this.addNote());
            
            document.addEventListener('keydown', (e) => { if(e.key === 'Escape') this.closeModal(); });
            document.getElementById('modal').addEventListener('click', (e) => { if(e.target === document.getElementById('modal')) this.closeModal(); });
        }
        
        switchView(view) { 
            this.currentView = view; 
            this.renderCurrentView(); 
            this.closeModal(); 
        }
    }

    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        // Store the event for later use
        if (window.app) {
            window.app.deferredPrompt = e;
        }
        setTimeout(() => {
            if(!window.matchMedia('(display-mode: standalone)').matches && window.app) {
                document.getElementById('installPrompt').style.display = 'flex';
            }
        }, 2000);
    });

    // Initialize app
    window.app = new CathedralOS();
})();