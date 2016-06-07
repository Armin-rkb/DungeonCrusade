using UnityEngine;
using System.Collections;

public class InputManager : MonoBehaviour
{
    public delegate void JoystickEventHandler();
    public JoystickEventHandler OnControllerConnected;

    [SerializeField]
    private PlayerMovement[] _playerMovement;


    void Start()
    {
        CheckControllers();
    }

    void CheckControllers()
    {

        if (Input.GetJoystickNames().Length > 0)
        {
            if (Input.GetJoystickNames()[0] != null)
                _playerMovement[0].SetJoyStick = true;

            else if (Input.GetJoystickNames()[1] != null)
                _playerMovement[1].SetJoyStick = true;

            else if (Input.GetJoystickNames()[2] != null)
                _playerMovement[2].SetJoyStick = true;

            else if (Input.GetJoystickNames()[3] != null)
                _playerMovement[3].SetJoyStick = true;
        }
        else
        {
            foreach (PlayerMovement player in _playerMovement)
                player.SetJoyStick = false;
        }


        if (OnControllerConnected != null)
            OnControllerConnected();



    }
}
