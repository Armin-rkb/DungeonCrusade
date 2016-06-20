using UnityEngine;
using System.Collections;

public class DragonMovement : MonoBehaviour {

    [SerializeField]
    private float _xSpeed;

    [SerializeField]
    private float _ySpeed;

    [SerializeField]
    private Rigidbody2D _dragonRigidBody2D;

    private bool _moveUp;

    void Update()
    {
        if (_moveUp)
        {
            _dragonRigidBody2D.velocity = new Vector2(_xSpeed, _ySpeed);

            if (_ySpeed <= 10)
                _ySpeed += 0.25f;
        }
            
    }
    public void MoveDragonUp()
    {
        _moveUp = true;
        _dragonRigidBody2D.isKinematic = false;
    }
}
