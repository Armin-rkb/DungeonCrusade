using UnityEngine;
using System.Collections;

public class JoinCheck : MonoBehaviour {


    public delegate void OnPlayerEventHandler();
    public OnPlayerEventHandler OnPlayerReady;

    public delegate void OnControllerEventHandler();

    public OnControllerEventHandler OnPlayerOneEnter;
    public OnControllerEventHandler OnPlayerTwoEnter;
    public OnControllerEventHandler OnPlayerThreeEnter;
    public OnControllerEventHandler OnPlayerFourEnter;

    [SerializeField]
    private JoinManager _joinManager;

    bool _p1Joined;
    bool _p2Joined;
    bool _p3Joined;
    bool _p4Joined;


    void Update()
    {

        if (_joinManager != null)
        {
            AssignPlayerAmount();
            CheckPlayerAmount();
        }
    }

    void AssignPlayerAmount()
    {
        if (_joinManager.Players < 4)
        {
            CheckP1();
            CheckP2();
            CheckP3();
            CheckP4();
        }
    }

    void CheckPlayerAmount()
    {
        if (_joinManager.Players >= 2)
        {
            if (OnPlayerReady != null)
                OnPlayerReady();
        }
    }

    void CheckP1()
    {
        if (!_p1Joined)
        {
            if (Input.GetKeyDown(KeyCode.Alpha1) || Input.GetButtonDown(ControllerInputs.p1submit))
            {
                if (OnPlayerOneEnter != null)
                    OnPlayerOneEnter();

                _joinManager.AddPlayer++;
                _p1Joined = true;
            }
        }
        else
        {
            if (Input.GetKeyDown(KeyCode.Alpha5))
            {
                _p1Joined = false;
            }
        }
    }
    

   void CheckP2()
    {
        if (!_p2Joined)
        {
            if (Input.GetKeyDown(KeyCode.Alpha2) || Input.GetButtonDown(ControllerInputs.p2submit))
            {
                if (OnPlayerTwoEnter != null)
                    OnPlayerTwoEnter();

                _joinManager.AddPlayer++;
                _p2Joined = true;
            }
        }
    }

     void CheckP3()
    {
        if (!_p3Joined)
        {
            if (Input.GetKeyDown(KeyCode.Alpha3) || Input.GetButtonDown(ControllerInputs.p3submit))
            {

                if (OnPlayerThreeEnter != null)
                    OnPlayerThreeEnter();


                _joinManager.AddPlayer++;
                _p3Joined = true;
            }
        }
    }

     void CheckP4()
    {
        if (!_p4Joined)
        {
            if (Input.GetKeyDown(KeyCode.Alpha4) || Input.GetButtonDown(ControllerInputs.p4submit))
            {
                if (OnPlayerFourEnter != null)
                    OnPlayerFourEnter();


                _joinManager.AddPlayer++;
                _p4Joined = true;
            }
        }
    }
}
