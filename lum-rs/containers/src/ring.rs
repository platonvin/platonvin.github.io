// vector that has index that moves by one untile reaches the end and then wraps
// primarly used for CPU-GPU resources, where GPU operates on previous frame resources, and CPU operates on current (frame resources)

use std::ops::{Index, IndexMut};

#[derive(Debug)]
pub struct Ring<T> {
    pub data: Box<[T]>,
    pub index: usize,
}

impl<T: Clone> Clone for Ring<T> {
    fn clone(&self) -> Self {
        Ring {
            data: self.data.clone(),
            index: self.index.clone(),
        }
    }
}

impl<T: Default> Default for Ring<T> {
    fn default() -> Self {
        Ring {
            data: Default::default(),
            index: Default::default(),
        }
    }
}

impl<T: Clone> Ring<T> {
    /// Creates a new `Ring` with a given size and initializes all elements with `T::default()`.
    pub fn new_clone(size: usize, value: T) -> Self {
        let data = (0..size).map(|_| value.clone()).collect::<Vec<_>>().into_boxed_slice();
        Self { data, index: 0 }
    }
    pub fn from_vec_clone(data: Vec<T>) -> Self {
        Self {
            data: data.into_boxed_slice(),
            index: 0,
        }
    }
    /// Resizes the `Ring` and initializes new elements with `T::default()`.
    pub fn resize_clone(&mut self, size: usize, value: T) {
        let mut new_data = (0..size).map(|_| value.clone()).collect::<Vec<_>>();
        // move existing data, up to the smaller of the old and new sizes
        let len = std::cmp::min(self.data.len(), size);

        for i in 0..len {
            new_data[i] = std::mem::replace(&mut self.data[i], value.clone());
        }

        self.data = new_data.into_boxed_slice();

        if self.data.len() <= self.index {
            self.index = self.data.len() - 1;
        }
    }
}

impl<T: Default> Ring<T> {
    /// Creates a new `Ring` with a given size and initializes all elements with `T::default()`.
    pub fn new(size: usize) -> Self {
        let data = (0..size).map(|_| T::default()).collect::<Vec<_>>().into_boxed_slice();
        Self { data, index: 0 }
    }
    /// Resizes the `Ring` and initializes new elements with `T::default()`.
    /// Existing elements are moved to the new `data` array.
    pub fn resize(&mut self, size: usize) {
        let mut new_data = (0..size).map(|_| T::default()).collect::<Vec<_>>();
        // move existing data, up to the smaller of the old and new sizes
        let len = std::cmp::min(self.data.len(), size);

        for i in 0..len {
            new_data[i] = std::mem::replace(&mut self.data[i], T::default());
        }

        self.data = new_data.into_boxed_slice();

        if self.data.len() <= self.index {
            self.index = self.data.len() - 1;
        }
    }
}

impl<T> Ring<T> {
    /// Returns the current (to index) element in the Ring.
    pub fn current(&self) -> &T {
        &self.data[self.index]
    }
    /// Returns the previous (to index, wrapping around len) element in the Ring.
    pub fn previous(&self) -> &T {
        let index = self.index + self.data.len() - 1;
        let wrapped_index = index % self.data.len();
        &self.data[wrapped_index]
    }
    /// Returns the next (to index, wrapping around len) element in the Ring.
    pub fn next(&self) -> &T {
        let index = self.index + 1;
        let wrapped_index = index % self.data.len();
        &self.data[wrapped_index]
    }

    /// Mutably access the current element in the Ring.
    pub fn current_mut(&mut self) -> &mut T {
        &mut self.data[self.index]
    }
    /// Mutably access the previous (to index, wrapping around len) element in the Ring.
    pub fn previous_mut(&self) -> &T {
        let index = self.index + self.data.len() - 1;
        let wrapped_index = index % self.data.len();
        &self.data[wrapped_index]
    }
    /// Mutably access the next (to index, wrapping around len) element in the Ring.
    pub fn next_mut(&self) -> &T {
        let index = self.index + 1;
        let wrapped_index = index % self.data.len();
        &self.data[wrapped_index]
    }

    /// Moves to the next element in the Ring (circularly).
    pub fn move_next(&mut self) {
        self.index = (self.index + 1) % self.data.len();
    }

    /// Moves to the previous element in the Ring (circularly).
    pub fn move_previous(&mut self) {
        if self.index == 0 {
            self.index = self.data.len() - 1;
        } else {
            self.index -= 1;
        }
    }

    /// Access an element by absolute index (circularly).
    pub fn get(&self, idx: usize) -> &T {
        &self.data[idx % self.data.len()]
    }

    /// Mutably access an element by absolute index (circularly).
    pub fn get_mut(&mut self, idx: usize) -> &mut T {
        let len = self.data.len();
        &mut self.data[idx % len]
    }

    /// Resets the index to zero.
    pub fn reset_index(&mut self) {
        self.index = 0;
    }

    /// Returns the length of the Ring.
    pub fn len(&self) -> usize {
        self.data.len()
    }

    /// Checks if the Ring is empty.
    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }

    pub fn as_slice(&self) -> &[T] {
        &self.data
    }

    pub fn as_mut_slice(&mut self) -> &mut [T] {
        &mut self.data
    }

    pub fn iter(&'_ self) -> RingIterator<'_, T> {
        RingIterator {
            ring: self,
            position: 0,
        }
    }

    pub fn first(&self) -> &T {
        &self.data[0]
    }
}

impl<T> Ring<T> {
    /// Creates a new `Ring` with a given size and initializes all elements with `T::default()`.
    pub fn new_with(size: usize, lambda: impl Fn(usize) -> T) -> Self {
        let data = (0..size).map(lambda).collect::<Vec<_>>().into_boxed_slice();
        Self { data, index: 0 }
    }
    /// Creates a new `Ring` from a given Vec.
    pub fn from_vec(data: Vec<T>) -> Self {
        Self {
            data: data.into_boxed_slice(),
            index: 0,
        }
    }
    /// Resizes the `Ring` and initializes new elements with `T::default()`.
    /// Existing elements are moved to the new `data` array.
    pub fn resize_with(&mut self, size: usize, lambda: impl Fn(usize) -> T) {
        let mut new_data = (0..size).map(&lambda).collect::<Vec<_>>();
        // Move existing data, up to the smaller of the old and new sizes.
        let len = std::cmp::min(self.data.len(), size);

        for i in 0..len {
            new_data[i] = std::mem::replace(&mut self.data[i], lambda(i));
        }

        self.data = new_data.into_boxed_slice();

        if self.data.len() <= self.index {
            self.index = self.data.len() - 1;
        }
    }
}

/// Implement `Index` for read-only access using square brackets.
impl<T> Index<usize> for Ring<T> {
    type Output = T;

    fn index(&self, idx: usize) -> &Self::Output {
        self.get(idx)
    }
}

/// Implement `IndexMut` for mutable access using square brackets.
impl<T> IndexMut<usize> for Ring<T> {
    fn index_mut(&mut self, idx: usize) -> &mut Self::Output {
        self.get_mut(idx)
    }
}

/// Iterator for `Ring`.
pub struct RingIterator<'a, T> {
    ring: &'a Ring<T>,
    position: usize,
}
pub struct RingIteratorMut<'a, T> {
    ring: &'a mut Ring<T>,
    position: usize,
}

impl<'a, T> IntoIterator for &'a Ring<T> {
    type Item = &'a T;
    type IntoIter = RingIterator<'a, T>;

    fn into_iter(self) -> Self::IntoIter {
        RingIterator {
            ring: self,
            position: 0,
        }
    }
}

impl<'a, T> Iterator for RingIterator<'a, T> {
    type Item = &'a T;

    fn next(&mut self) -> Option<Self::Item> {
        if self.position < self.ring.len() {
            let item = &self.ring.data[self.position];
            self.position += 1;
            Some(item)
        } else {
            None
        }
    }
}

impl<T> FromIterator<T> for Ring<T> {
    fn from_iter<I: IntoIterator<Item = T>>(iter: I) -> Self {
        let data = iter.into_iter().collect::<Vec<_>>().into_boxed_slice();
        Self { data, index: 0 }
    }
}
