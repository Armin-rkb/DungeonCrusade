using UnityEngine;
using System.Collections;

public class InputManager : MonoBehaviour
{
    public delegate void JoystickEventHandler();
    public JoystickEventHandler OnControllerConnected;


    void Awake()
    {
        CheckControllers();
    }

    void CheckControllers()
    {
        if (Input.GetJoystickNames().Length > 0)
        {
            if (OnControllerConnected != null)
                OnControllerConnected();
        }

        print(Input.GetJoystickNames().Length);
    }

    void Update()
    {
        int i = 1;
        while (i < 4)
        {
            if (Mathf.Abs(Input.GetAxis("HorizontalCP" + i)) > 0.2F)
                Debug.Log(Input.GetJoystickNames()[i] + " is moved");

            i++;
        }
    }

}
