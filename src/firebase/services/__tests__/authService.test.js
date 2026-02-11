// Тесты для authService
import { authService } from '../authService';

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

// Mock Firebase config
jest.mock('../../config', () => ({
  auth: { currentUser: null },
  db: {},
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login main admin successfully', async () => {
      const { signInWithEmailAndPassword } = require('firebase/auth');
      const { getDoc } = require('firebase/firestore');
      
      const mockUser = { 
        uid: 'admin123', 
        email: 'ustimweb72@gmail.com' 
      };
      
      signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
      getDoc.mockResolvedValue({ exists: () => false });
      
      const result = await authService.login('ustimweb72@gmail.com', 'password');
      
      expect(result).toEqual(mockUser);
      expect(signInWithEmailAndPassword).toHaveBeenCalled();
    });

    it('should login regular user successfully', async () => {
      const { signInWithEmailAndPassword } = require('firebase/auth');
      const { getDoc } = require('firebase/firestore');
      
      const mockUser = { 
        uid: 'user123', 
        email: 'user@example.com' 
      };
      
      signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
      getDoc.mockResolvedValue({ exists: () => true });
      
      const result = await authService.login('user@example.com', 'password');
      
      expect(result).toEqual(mockUser);
    });

    it('should reject deleted user', async () => {
      const { signInWithEmailAndPassword } = require('firebase/auth');
      const { getDoc } = require('firebase/firestore');
      const { signOut } = require('firebase/auth');
      
      const mockUser = { 
        uid: 'deleted123', 
        email: 'deleted@example.com' 
      };
      
      signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
      getDoc.mockResolvedValue({ exists: () => false });
      signOut.mockResolvedValue();
      
      await expect(
        authService.login('deleted@example.com', 'password')
      ).rejects.toThrow('Доступ заборонено');
    });

    it('should handle login errors', async () => {
      const { signInWithEmailAndPassword } = require('firebase/auth');
      
      const mockError = new Error('Invalid credentials');
      signInWithEmailAndPassword.mockRejectedValue(mockError);
      
      await expect(
        authService.login('wrong@example.com', 'wrongpass')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const { signOut } = require('firebase/auth');
      signOut.mockResolvedValue();
      
      await authService.logout();
      
      expect(signOut).toHaveBeenCalled();
    });

    it('should handle logout errors', async () => {
      const { signOut } = require('firebase/auth');
      const mockError = new Error('Logout failed');
      signOut.mockRejectedValue(mockError);
      
      await expect(authService.logout()).rejects.toThrow('Logout failed');
    });
  });

  describe('checkUserExists', () => {
    it('should return true if user exists', async () => {
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({ exists: () => true });
      
      const result = await authService.checkUserExists('user123');
      
      expect(result).toBe(true);
    });

    it('should return false if user does not exist', async () => {
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({ exists: () => false });
      
      const result = await authService.checkUserExists('user123');
      
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const { getDoc } = require('firebase/firestore');
      getDoc.mockRejectedValue(new Error('Database error'));
      
      const result = await authService.checkUserExists('user123');
      
      expect(result).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', () => {
      const { auth } = require('../../config');
      auth.currentUser = { uid: 'user123', email: 'test@example.com' };
      
      const result = authService.getCurrentUser();
      
      expect(result).toEqual({ uid: 'user123', email: 'test@example.com' });
    });
  });

  describe('onAuthChange', () => {
    it('should subscribe to auth changes', () => {
      const { onAuthStateChanged } = require('firebase/auth');
      const mockCallback = jest.fn();
      
      authService.onAuthChange(mockCallback);
      
      expect(onAuthStateChanged).toHaveBeenCalledWith(
        expect.anything(),
        mockCallback
      );
    });
  });
});
