using UnityEngine;
using System.Collections;

public class InputManager : MonoBehaviour
{
    public delegate void JoystickEventHandler();
    public JoystickEventHandler OnControllerConnected;

    [SerializeField]
    private PlayerMovement[] _playerMovement;


    void Awake()
    {
        CheckControllers();
    }

    void CheckControllers()
    {

        if (OnControllerConnected != null)
            OnControllerConnected();

        if (Input.GetJoystickNames()[0] != null)
            _playerMovement[0].SetJoyStick = true;

        else if (Input.GetJoystickNames()[1] != null)
            _playerMovement[1].SetJoyStick = true;

        else if (Input.GetJoystickNames()[2] != null)
            _playerMovement[2].SetJoyStick = true;

        else if (Input.GetJoystickNames()[3] != null)
            _playerMovement[3].SetJoyStick = true;

        else if (Input.GetJoystickNames().Length == null)
        {
            foreach (PlayerMovement player in _playerMovement)
                player.SetJoyStick = false;
        }
            
    }
}
