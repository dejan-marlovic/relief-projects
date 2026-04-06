//ES module import pattern in React
//It combines two kinds of imports from the same module:
//Default import → React
//Named imports → useEffect, useMemo, useState
//react in this case is module name
//pattern is: import DefaultThing, { namedThing1, namedThing2 } from "module-name";
//React is the main React library
//hooks like useState, useEffect, and useMemo are functions provided by the React package

//useState

//Lets a component store and update local state.
/*
Use it when:

input values change
dropdown selections change
loading flags change
fetched data should be stored
*/

/*
useEffect

Lets you run side effects after render.

Use it for:

fetching data from API
adding/removing event listeners
syncing something after render
reacting to dependency changes
*/

/*
useMemo

Memoizes a computed value so React does not recalculate it on every render unless dependencies change.

Use it when:

calculation is a bit expensive
you want stable derived values between renders
you want to avoid unnecessary recalculation
 */
import React, { useEffect, useMemo, useState } from "react";

//useNavigate gives you a function that lets you send the user to another route in code.
//const navigate = useNavigate();
//Now navigate is a function we can use like this:
//navigate("/login");
//We use useNavigate when navigation should happen because of some logic, not just because the user

/*
rendering in React means React is figuring out what should appear on the screen right now.
A React component is basically a function that says:

“Based on the current data, this is the UI I want to show.”

Rendering = building the visible UI from your component code

So React looks at:

your component
your state
your props

and then decides:

what text to show
what buttons to show
what lists to show
what classes or styles to apply

Your component says:

if loading → show "Loading..."
if user exists → show "Welcome Dejan"
if no user → show "Please log in"

React checks the current situation and puts the right thing on the screen.

That process is rendering.

React runs the component function again when something changes

So rendering is not only the first display.
It also happens again when data change


Important simple idea

React rendering does not mean the whole browser page reloads.

It usually means:

React runs your component again
compares old UI with new UI
updates only the parts that changed

So if only one number changes, React usually only updates that small part.

“Render” in plain words

You can think of it as:

read the component
calculate what the UI should look like
show or update it

First render

The component appears for the first time.

Example:

<UserCard />

React renders it and shows it.

Re-render

The component runs again because something changed.

Usually because:

state changed
props changed
parent re-rendered

Important distinction
Rendering is not the same as:
clicking
fetching
saving to database
side effects

Those things may cause a render, but they are not the render itself.

For example:

1. click button
2. button updates state
3. state change causes render

So the render is the UI update part.


Tiny mental model

A component is like this:

UI = f(data)

Meaning:

The UI is a function of the current data.

If data changes, React runs the function again and gets new UI.

That is the core idea of rendering.

So understanding rendering helps explain:

why components run again
why console.log may print multiple times
why useMemo can help
why unnecessary re-renders matter sometimes

One sentence summary

In plain language, rendering in React means React reading your component and deciding what 
should be shown on the screen based on the current data.

=======================

React handles:

components
state
rendering
effects

react-router-dom handles:

URLs
routes
page navigation
route params
browser history

So useNavigate belongs to the router library.


Like other hooks, useNavigate should be called at the top level of the component, not inside conditions or loops.
*/
import { useNavigate } from "react-router-dom";

//named import pattern, but this time from the react-icons library.
/*
these:

FiTrash2
FiRefreshCw
FiAlertCircle
FiBriefcase

are React components that render SVG icons.

//react-icons = the icon library package
// /fi = the Feather Icons set inside that package
//import icons from the Feather icon collection

Why do they look like React components?

Because they are React components.

Instead of manually drawing icons with SVG code, you import ready-made icon components and place them in your UI.
*/
import {
  FiTrash2,
  FiRefreshCw,
  FiAlertCircle,
  FiBriefcase,
} from "react-icons/fi";

import styles from "./DeletePosition.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeletePosition = () => {
  const navigate = useNavigate();

  //function React can call to calculate the memoized value.
  //That means authFetch becomes whatever createAuthFetch(navigate) returns, probably a custom fetch function.
  //Build my authFetch function once, and do not rebuild it on every render unless navigate changes
  //authFetch is a memoized function value. Because createAuthFetch(navigate) returns a function
  //That returned function is what gets stored in authFetch.
  /*
    React does this:

    1. calls createAuthFetch(navigate)
    2. gets back an async function
    3. stores that returned function as the memoized value
    4. puts that stored function into authFetch

    So later, when you do:

    await authFetch(url, options);
    authFetch becomes a memoized function reference.
  */
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [positions, setPositions] = useState([]);

  const [selectedPositionId, setSelectedPositionId] = useState("");

  const [formError, setFormError] = useState("");
  const [sucessMessage, setSuccessMessage] = useState("");

  const selectedPosition = useMemo(() => {
    const id = Number(selectedPositionId);
    if (!id) return null;
    return positions.find((position) => position.id === id) || null;
  }, [selectedPositionId, positions]);

  const loadPositions = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");
    } catch (err) {
    } finally {
    }
  };
};

export default DeletePosition;
