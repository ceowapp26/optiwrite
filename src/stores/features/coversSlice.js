import { createSelector, createSlice } from "@reduxjs/toolkit";

const initialState = {
    initialCoverPosition: 0,
    newCoverPosition: 0,
};

const coversSlice = createSlice({
    name: 'covers',
    initialState,
    reducers: {
        setInitialCoverPosition: (state, action) => {
          state.initialCoverPosition = action.payload 
        },
        setNewCoverPosition: (state, action) => {
          state.newCoverPosition = action.payload 
        },
    }
});

export const { setInitialCoverPosition, setNewCoverPosition } = coversSlice.actions;

export const selectInitialCoverPosition = createSelector((state) => state.covers, (covers) => {
    return covers.initialCoverPosition;
});
export const selectNewCoverPosition = createSelector((state) => state.covers, (covers) => {
    return covers.newCoverPosition;
});

export default coversSlice.reducer;
