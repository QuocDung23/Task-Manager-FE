import { create } from "zustand";

export interface SearchUiState {
  search: string;
  debouncedSearch: string;
}

export interface ListUiState extends SearchUiState {
  page: number;
}

const createSearchUiState = (): SearchUiState => ({
  search: "",
  debouncedSearch: "",
});

const createListUiState = (): ListUiState => ({
  ...createSearchUiState(),
  page: 1,
});

export const EMPTY_LIST_UI_STATE: ListUiState = createListUiState();
export const EMPTY_SEARCH_UI_STATE: SearchUiState = createSearchUiState();

interface WorkspaceUiState {
  projectList: ListUiState;
  boardLists: Record<string, ListUiState>;
  listSearchByBoardId: Record<string, SearchUiState>;
  createProjectDialogOpen: boolean;
  createBoardProjectId: string | null;

  setProjectSearch: (search: string) => void;
  commitProjectSearch: (search: string) => void;
  setProjectPage: (page: number) => void;

  setBoardSearch: (projectId: string, search: string) => void;
  commitBoardSearch: (projectId: string, search: string) => void;
  setBoardPage: (projectId: string, page: number) => void;

  setListSearch: (boardId: string, search: string) => void;
  commitListSearch: (boardId: string, search: string) => void;

  setCreateProjectDialogOpen: (open: boolean) => void;
  openCreateBoardDialog: (projectId: string) => void;
  closeCreateBoardDialog: (projectId: string) => void;

  resetWorkspaceUi: () => void;
}

const updateBoardList = (
  boardLists: Record<string, ListUiState>,
  projectId: string,
  update: (state: ListUiState) => ListUiState,
): Record<string, ListUiState> => ({
  ...boardLists,
  [projectId]: update(boardLists[projectId] ?? createListUiState()),
});

export const useWorkspaceUiStore = create<WorkspaceUiState>()((set) => ({
  projectList: createListUiState(),
  boardLists: {},
  listSearchByBoardId: {},
  createProjectDialogOpen: false,
  createBoardProjectId: null,

  setProjectSearch: (search) =>
    set((state) => ({
      projectList: { ...state.projectList, search, page: 1 },
    })),

  commitProjectSearch: (debouncedSearch) =>
    set((state) =>
      state.projectList.search.trim() === debouncedSearch
        ? {
            projectList: { ...state.projectList, debouncedSearch },
          }
        : state,
    ),

  setProjectPage: (page) =>
    set((state) => ({ projectList: { ...state.projectList, page } })),

  setBoardSearch: (projectId, search) => {
    if (!projectId) return;
    set((state) => ({
      boardLists: updateBoardList(state.boardLists, projectId, (list) => ({
        ...list,
        search,
        page: 1,
      })),
    }));
  },

  commitBoardSearch: (projectId, debouncedSearch) => {
    if (!projectId) return;
    set((state) => {
      const list = state.boardLists[projectId];
      if (!list || list.search.trim() !== debouncedSearch) return state;
      return {
        boardLists: updateBoardList(state.boardLists, projectId, (current) => ({
          ...current,
          debouncedSearch,
        })),
      };
    });
  },

  setBoardPage: (projectId, page) => {
    if (!projectId) return;
    set((state) => ({
      boardLists: updateBoardList(state.boardLists, projectId, (list) => ({
        ...list,
        page,
      })),
    }));
  },

  setListSearch: (boardId, search) => {
    if (!boardId) return;
    set((state) => ({
      listSearchByBoardId: {
        ...state.listSearchByBoardId,
        [boardId]: {
          ...(state.listSearchByBoardId[boardId] ?? createSearchUiState()),
          search,
        },
      },
    }));
  },

  commitListSearch: (boardId, debouncedSearch) => {
    if (!boardId) return;
    set((state) => {
      const current = state.listSearchByBoardId[boardId];
      if (!current || current.search.trim() !== debouncedSearch) return state;
      return {
        listSearchByBoardId: {
          ...state.listSearchByBoardId,
          [boardId]: { ...current, debouncedSearch },
        },
      };
    });
  },

  setCreateProjectDialogOpen: (open) => set({ createProjectDialogOpen: open }),

  openCreateBoardDialog: (projectId) => {
    if (!projectId) return;
    set({ createBoardProjectId: projectId });
  },

  closeCreateBoardDialog: (projectId) =>
    set((state) =>
      state.createBoardProjectId === projectId
        ? { createBoardProjectId: null }
        : state,
    ),

  resetWorkspaceUi: () =>
    set({
      projectList: createListUiState(),
      boardLists: {},
      listSearchByBoardId: {},
      createProjectDialogOpen: false,
      createBoardProjectId: null,
    }),
}));

export const getBoardListUiState = (
  state: WorkspaceUiState,
  projectId: string | undefined,
): ListUiState =>
  (projectId ? state.boardLists[projectId] : undefined) ?? EMPTY_LIST_UI_STATE;

export const getListSearchUiState = (
  state: WorkspaceUiState,
  boardId: string,
): SearchUiState =>
  state.listSearchByBoardId[boardId] ?? EMPTY_SEARCH_UI_STATE;
