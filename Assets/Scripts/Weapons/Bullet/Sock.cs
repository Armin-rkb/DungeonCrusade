using UnityEngine;
using System.Collections;

public class Sock : MonoBehaviour
{
    //Rigidbody of the Gameobject
    [SerializeField] private Rigidbody2D rbSock;
    //Sprite of this bullet
    [SerializeField] private SpriteRenderer sprite;
    //Speed of the bullet
    [SerializeField] private float speed;
    //Amout of damage that the bullet will deal
    [SerializeField] private float damage;
    //Amount of Knockback the bullet will give
    [SerializeField] private float knockback;
    //Time left for explosion
    [SerializeField] private float explodeTime;
    //Explosion object
    [SerializeField] private GameObject explosionObj;
    private bool isRight;
    private bool isLeft;
    private bool bounce;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
        sprite.flipX = true;
        SoundManager.PlayAudioClip(AudioData.Sock);
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
        SoundManager.PlayAudioClip(AudioData.Sock);
    }

    void FixedUpdate()
    {
        explodeTime--;

        if (isRight)
            rbSock.velocity = new Vector2(speed, rbSock.velocity.y);
        else if (isLeft)
            rbSock.velocity = new Vector2(-speed, rbSock.velocity.y);

        if (bounce)
        {
            speed = 1;
            bounce = false;
        }

        if (explodeTime < 0)
        {
            //When the time is up instantiate our explosion obj and remove this obj
            Instantiate(explosionObj, transform.position, transform.rotation);
            Destroy(this.gameObject);
        }
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.CompareTag(GameTags.ground))
            {
                bounce = true;
            }
        }
    }
}
