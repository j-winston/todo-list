// Module: projectController.js
// Role: Coordinator
// Responsibilities: coordinate movement of project data

import pubSub from "./pubsub";
import storage from "./storage";
import uid from "./uid";

const projectController = (() => {
  const _store = (project) => {
    if (storage.saveProject(project)) {
      return true;
    }
  };

  const getProjectModel = () => {
    const projectModel = {
      id: uid.create(),
      name: "",
      tasks: [],
    };
    return projectModel;
  };

  const _getProject = (name) => {
    return storage.loadProject(name);
  };

  const assignProjectValues = (newProject, formKeyValuePairs) => {
      // iterating over non-transparent keys of two 
      // objects(one not transparent) is a horrible horrible
      // idea that should never be repeated 
      
    //for (let key in formKeyValuePairs) {
    //  if (key in newProject) {
    //    newProject[key] = formKeyValuePairs[key];
    //  } else {
    //    console.log("KeyError:" + key + " not found");
    //  }
      newProject.id = formKeyValuePairs.id; 
      newProject.name = formKeyValuePairs.name;
    
    return newProject;
  };

  const loadAllProjects = () => {
    const projArr = storage.loadAllProjects();
    pubSub.publish("allSavedProjectsRetrieved", projArr);
  };

  const createNewProject = (formKeyValues) => {
    const emptyProject = getProjectModel();
    const project = assignProjectValues(emptyProject, formKeyValues);

    if (_store(project)) {
      pubSub.publish("newProjectAdded", project);
    }

    return project;
  };

  const remove = (name) => {
    if (storage.deleteProject(name)) {
      pubSub.publish("projectDeleted", name);
    }
  };

  const removeAll = () => {
    storage.deleteAllProjects();
  };

  const addTask = (task) => {
    const project = _getProject(task.getProjectName);
    if (project.tasks.push(task)) {
      _store(project);
      pubSub.publish("taskAdded", task);
    }
  };

  const findProject = (projectName) => {
    const proj = storage.loadProject(projectName);
    pubSub.publish("projectRetrieved", proj);

    return proj;
  };

  return {
    loadAllProjects,
    createNewProject,
    remove,
    removeAll,
    addTask,
    findProject,
  };
})();

export default projectController;
