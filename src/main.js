import stew, { virtualFramework, useMemo, useEffect, useState } from './module';

Object.assign(stew, {
	virtualFramework,
	useMemo,
	useEffect,
	useState,
});

if (typeof window === 'object') {
	window.stew = stew;
} else if (typeof module === 'object') {
	module.exports = stew;
}

export default stew;
