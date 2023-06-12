import controllerInterface from "./controllerInterface";
import projectController from "./projectController";
import pubSub from "./pubsub";

const domService = (() => {
  const hideElement = (el) => {
    el.style.visibility = "hidden";
  };

  const showElement = (hiddenElement) => {
    const element = document.querySelector(hiddenElement);

    element.style.visibility = "visible";
  };

  const removeElement = (el) => {
    el.remove();
  };

  const createForm = (templateId) => {
    const template = getTemplateClone(templateId);
    const form = template.querySelector("form");
    form.setAttribute("data-id", getCurrentProjectName());

    return form;
  };

  const findProjectEl = (projectId) => {
    const projEl = document.querySelector(
      "[data-id=" + CSS.escape(projectId) + "]"
    );

    return projEl;
  };

  const removeProject = (proj) => {
    const projElement = findProjectEl(proj.id);

    if (controllerInterface.deleteProject(proj.name)) {
      removeElement(projElement);
      clearTaskViewer();
    }
  };

  const getFormValues = (form) => {
    const inputElements = form.querySelectorAll("input");
    const formValues = {};

    inputElements.forEach((input) => {
      formValues[input.id] = input.value;
    });

    return formValues;
  };
  const getCurrentProjectName = () => {
    const name = document.querySelector(".project-viewer-title").textContent;
    return name;
  };

  const projectExists = (projectId) => {
    if (document.querySelector("[data-id=" + CSS.escape(projectId) + "]")) {
      return true;
    }
    return false;
  };

  const createProjectElement = (project) => {
    if (!projectExists(project.id) && project.name != "Inbox") {
      const projectContainerElement = document.createElement("div");
      projectContainerElement.className = "project";
      projectContainerElement.setAttribute("data-id", project.id);

      const projectTitleElement = document.createElement("div");
      projectTitleElement.addEventListener("click", () => {
        updateTaskViewerTitle(project.name);
        pubSub.publish("projectClicked", project);
      });
      projectTitleElement.textContent = project.name;
      projectTitleElement.className = "project-title";

      const deleteBtn = document.createElement("div");
      deleteBtn.className = "project-delete-btn";
      deleteBtn.textContent = "X";
      deleteBtn.addEventListener("click", () => {
        removeProject(project);
      });

      projectContainerElement.appendChild(projectTitleElement);
      projectContainerElement.appendChild(deleteBtn);

      return projectContainerElement;
    }
  };

  const clearTaskViewer = () => {
    document
      .querySelectorAll(".task-container")
      .forEach((task) => removeElement(task));
  };
  const updateTaskViewerTitle = (projName) => {
    const title = document.querySelector(".project-viewer-title");
    title.textContent = projName;
  };

  const showTaskEditMenu = (taskContainer) => {
    // We can use the current task info to autofill the edit fields
    const titleEl = taskContainer.querySelector(".task-title");
    const dueDateEl = taskContainer.querySelector(".task-due-date");
    const descriptionEl = taskContainer.querySelector(".task-description");

    // When user clicks edit, show the edit form
    const template = document.getElementById("editTaskTemplate");
    const form = template.content.cloneNode(true);

    const cancelBtn = form.querySelector(".cancel-btn");
    const saveBtn = form.querySelector(".save-btn");

    // Populate the form inputs initially with current values
    form.getElementById("title").value = titleEl.textContent;
    form.getElementById("duedate").value = dueDateEl.textContent;
    form.getElementById("description").value = descriptionEl.textContent;

    cancelBtn.addEventListener("click", () => {
      const formEl = document.querySelector(".edit-task-form");
      removeElement(formEl);
    });

    saveBtn.addEventListener("click", () => {
      // We grab all the input values once they click save
      const editTaskForm = document.querySelector(".edit-task-form .inputs");
      const titleEl = editTaskForm.querySelector('input[class="title"]');
      const dueDateEl = editTaskForm.querySelector('input[type="date"]');
      const descriptionEl = editTaskForm.querySelector(
        'input[class="description"]'
      );

      // Finally, broadcast all the stored edits along unique
      // task id
      const taskEditFormValues = {};
      const taskId = taskContainer.getAttribute("data-id");

      taskEditFormValues.id = taskId;
      taskEditFormValues.projName = getCurrentProjectName();
      taskEditFormValues.name = titleEl.value;
      taskEditFormValues.duedate = dueDateEl.value;
      taskEditFormValues.description = descriptionEl.value;

      pubSub.publish("taskEditSubmitted", taskEditFormValues);

      // Once saved, remove the edit form
      editTaskForm.remove();
    });

    taskContainer.appendChild(form);
  };

  const _createNewTaskNode = (task) => {
    const newTaskContainer = document.createElement("div");
    // when task.id is changed to task.getId, this breaks it
    newTaskContainer.setAttribute("data-id", task.getId);
    newTaskContainer.classList.add("task-container");

    const taskCompleteBtn = document.createElement("input");
    taskCompleteBtn.classList.add("task-complete-btn");
    taskCompleteBtn.setAttribute("type", "checkbox");

    taskCompleteBtn.addEventListener("click", () => {
      removeElement(newTaskContainer);
    });

    const nameEl = document.createElement("p");
    nameEl.classList.add("task-title");
    nameEl.textContent = task.getTitle;

    const descriptionEl = document.createElement("p");
    descriptionEl.classList.add("task-description");
    descriptionEl.textContent = task.getDescription;

    const dueDateEl = document.createElement("p");
    dueDateEl.classList.add("task-due-date");
    dueDateEl.textContent = task.getDueDate;

    const taskBtnContainer = document.createElement("div");
    taskBtnContainer.classList.add("task-btn-container");

    const deleteBtnEl = document.createElement("div");
    deleteBtnEl.classList.add("delete-btn");
    deleteBtnEl.textContent = "Del";

    deleteBtnEl.addEventListener("click", () => {
      removeElement(newTaskContainer);
      pubSub.publish("taskDeleted", task);
    });

    const editBtnEL = document.createElement("div");
    editBtnEL.classList.add("edit-btn");
    editBtnEL.textContent = "Edit";

    editBtnEL.addEventListener("click", () => {
      showTaskEditMenu(newTaskContainer);
    });

    const taskInfoContainer = document.createElement("div");
    taskBtnContainer.append(deleteBtnEl, editBtnEL);
    taskInfoContainer.append(nameEl, descriptionEl, dueDateEl);

    newTaskContainer.append(
      taskCompleteBtn,
      taskInfoContainer,
      taskBtnContainer
    );

    return newTaskContainer;
  };

  const showTask = (task) => {
    // task.getId doesnt work here, either
    const taskViewer = document.querySelector(".project-tasks");

    const taskEl = _createNewTaskNode(task);
    taskViewer.appendChild(taskEl);
  };

  const showAllTasks = (project) => {
    for (const task of project.tasks) {
      // When inbox is loaded on start, task.getId doesnt work here
      showTask(task);
    }
  };

  const addProjectToViewer = (projectEl) => {
    const projectListContainer = document.querySelector(".project-container");
    projectListContainer.appendChild(projectEl);
  };

  const showAddProjectDialog = () => {
    const newProjectForm = createForm("new-project-template");

    const projectContainer = document.querySelector(".project-container");
    projectContainer.appendChild(newProjectForm);

    const confirmNewProjectBtn = document.querySelector(".confirm-project-btn");
    confirmNewProjectBtn.addEventListener("click", () => {
      const formValues = getFormValues(newProjectForm);
      removeElement(newProjectForm);

      submitProject(formValues.name);
    });

    const cancelNewProjectBtn = document.querySelector(".cancel-project-btn");
    cancelNewProjectBtn.addEventListener("click", () => {
      removeElement(newProjectForm);
    });
  };

  const showNewProject = (project) => {
    const projectEl = createProjectElement(project);
    updateTaskViewerTitle(project.name);

    addProjectToViewer(projectEl);

    clearTaskViewer();
    showAllTasks(project);
  };

  const parseDate = (dateVal) => {
    const strDate = dateVal.split("-");
    const date = strDate[1] + "/" + strDate[2] + "/" + strDate[0];

    return date;
  };

  const getTemplateClone = (templateId) => {
    const template = document.getElementById(templateId);
    const clone = template.content.cloneNode(true);

    return clone;
  };

  const appendFormToViewer = (form, el) => {
    const viewer = document.querySelector(el);

    viewer.appendChild(form);
  };

  const submitTask = (formKeyValues) => {
    controllerInterface.addTask(formKeyValues);
  };

  const showAddTask = () => {
    const form = createForm("new-task-template");
    appendFormToViewer(form, ".project-viewer");

    const projectName = getCurrentProjectName();
    console.log(projectName);
    form.setAttribute("data-id", projectName);

    // Event handlers
    const dueDateBtn = form.querySelector(".due-date-btn-text");
    dueDateBtn.addEventListener("click", () => {
      const datePicker = document.getElementById("duedate");
      datePicker.addEventListener("change", () => {
        const date = parseDate(datePicker.value);

        dueDateBtn.textContent = date;
      });

      datePicker.showPicker();
    });

    const cancelBtn = document.querySelector(".cancel-task-btn");
    cancelBtn.addEventListener("click", () => {
      form.remove();
    });

    const saveBtn = document.querySelector(".save-task-btn");
    saveBtn.addEventListener("click", () => {
      const formKeyValues = getFormValues(form);
      formKeyValues.projName = projectName;

      showElement(".add-task-btn");
      submitTask(formKeyValues);
      removeElement(form);
      //.pubSub.publish("taskSubmitted", formKeyValues);
    });
    // End event handlers
  };

  const addNewTask = () => {
    hideElement(document.querySelector(".add-task-btn"));
    showAddTask();
  };

  const startTaskEvents = () => {
    const addProjectBtn = document.querySelector(".add-project-btn");
    addProjectBtn.addEventListener("click", showAddProjectDialog);

    const addTaskBtn = document.querySelector(".add-task-btn");
    addTaskBtn.addEventListener("click", addNewTask);
  };

  const submitProject = (name) => {
    controllerInterface.addNewProject(name);
  };

  const createInbox = () => {
    updateTaskViewerTitle("Inbox");

    const inboxBtn = document.querySelector(".inbox-nav-link");
    inboxBtn.textContent = "Inbox";
    submitProject("Inbox");
    inboxBtn.addEventListener("click", () => {
      updateTaskViewerTitle("Inbox");
    });
  };

  const showInbox = () => {
    updateTaskViewerTitle("Inbox");
  };

  const getTaskContainer = (taskId) => {
    // Return the div container for the task
    const container = document.querySelector(
      "[data-id=" + CSS.escape(taskId) + "]"
    );

    return container;
  };

  const showProject = (project) => {
    updateTaskViewerTitle(project.name);
    clearTaskViewer();
    showAllTasks(project);
  };

  const showAllProjects = (projectsArr) => {
    for (const proj of projectsArr) {
      if (projectExists(proj) || proj.name === "Inbox") {
        showProject(proj);
      } else {
        showNewProject(proj);
      }
    }
  };

  const showUpdatedTask = (task) => {
    const name = task.name;
    const description = task.description;
    const dueDate = task.duedate;
    const container = getTaskContainer(task.id);

    container.querySelector(".task-title").textContent = name;
    container.querySelector(".task-description").textContent = description;

    container.querySelector(".task-due-date").textContent = dueDate;
  };

  const loadFromLocalStorage = () => {
    controllerInterface.getAllProjects();
  };

  const initializeUi = () => {
    startTaskEvents();
  };

  window.onload = (event) => {
    loadFromLocalStorage();
  };

  pubSub.subscribe("allProjectsRetrieved", showAllProjects);
  pubSub.subscribe("projectDeleted", showInbox);
  pubSub.subscribe("projectRetrieved", showProject);

  pubSub.subscribe("newProjectSaved", showNewProject);

  pubSub.subscribe("taskAdded", showTask);
  pubSub.subscribe("taskUpdated", showUpdatedTask);

  return {
    initializeUi,
  };
})();

export default domService;
